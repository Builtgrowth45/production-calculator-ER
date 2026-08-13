#!/usr/bin/env python3
"""Build geometry-aware Character Studio GLBs.

Takes the complete LOD0 piece JSON exported from the client f_Average.ltb and
m_Average.ltb, then adds missing Torso1–4 and Legs1–4 meshes to the existing
Average GLBs. Client coordinates/normals are copied unchanged; LithTech UVs are
converted to glTF with (u, 1-v). Existing torso/leg materials are reused so the
browser can apply faction textures to every style.

Usage:
  python3 scripts/build_character_studio_models.py \
      --female-json /tmp/f_Average.client.json \
      --male-json /tmp/m_Average.client.json
"""
from __future__ import annotations

import argparse
import json
import math
import re
import struct
from pathlib import Path

from fix_model_handedness import apply_handedness_conversion

ROOT = Path(__file__).resolve().parents[1]
CHARACTERS = ROOT / "models" / "Characters"
SLOTS = tuple(f"{slot}{style}" for slot in ("Torso", "Legs") for style in range(1, 5))


def parse_glb(path: Path):
    data = path.read_bytes()
    if data[:4] != b"glTF" or struct.unpack_from("<I", data, 4)[0] != 2:
        raise ValueError(f"not a glTF 2 GLB: {path}")
    json_len, json_type = struct.unpack_from("<II", data, 12)
    if json_type != 0x4E4F534A:
        raise ValueError(f"missing JSON chunk: {path}")
    json_end = 20 + json_len
    doc = json.loads(data[20:json_end])
    bin_len, bin_type = struct.unpack_from("<II", data, json_end)
    if bin_type != 0x004E4942:
        raise ValueError(f"missing BIN chunk: {path}")
    binary = bytearray(data[json_end + 8:json_end + 8 + bin_len])
    return doc, binary


def pack_glb(doc, binary: bytearray) -> bytes:
    while len(binary) % 4:
        binary.append(0)
    doc["buffers"][0]["byteLength"] = len(binary)
    json_bytes = json.dumps(doc, separators=(",", ":")).encode()
    json_bytes += b" " * ((-len(json_bytes)) % 4)
    total = 12 + 8 + len(json_bytes) + 8 + len(binary)
    return b"".join((
        struct.pack("<III", 0x46546C67, 2, total),
        struct.pack("<II", len(json_bytes), 0x4E4F534A), json_bytes,
        struct.pack("<II", len(binary), 0x004E4942), bytes(binary),
    ))


def append_aligned(binary: bytearray, payload: bytes) -> tuple[int, int]:
    while len(binary) % 4:
        binary.append(0)
    offset = len(binary)
    binary.extend(payload)
    return offset, len(payload)


def append_view(doc, binary, payload, target=None):
    offset, length = append_aligned(binary, payload)
    view = {"buffer": 0, "byteOffset": offset, "byteLength": length}
    if target is not None:
        view["target"] = target
    doc.setdefault("bufferViews", []).append(view)
    return len(doc["bufferViews"]) - 1


def append_accessor(doc, view, component_type, count, type_name, minimum=None, maximum=None):
    accessor = {
        "bufferView": view,
        "byteOffset": 0,
        "componentType": component_type,
        "count": count,
        "type": type_name,
    }
    if minimum is not None:
        accessor["min"] = minimum
    if maximum is not None:
        accessor["max"] = maximum
    doc.setdefault("accessors", []).append(accessor)
    return len(doc["accessors"]) - 1


def flatten(rows):
    return [value for row in rows for value in row]


def finite_rows(rows, width, label):
    if not rows or any(len(row) != width for row in rows):
        raise ValueError(f"{label}: expected non-empty {width}-component rows")
    if not all(math.isfinite(float(value)) for row in rows for value in row):
        raise ValueError(f"{label}: non-finite component")


def normalized_normals(positions, normals, triangles, name):
    accumulated = [[0.0, 0.0, 0.0] for _ in positions]
    for i0, i1, i2 in triangles:
        a, b, c = positions[i0], positions[i1], positions[i2]
        ab = [b[i] - a[i] for i in range(3)]
        ac = [c[i] - a[i] for i in range(3)]
        face = [
            ab[1] * ac[2] - ab[2] * ac[1],
            ab[2] * ac[0] - ab[0] * ac[2],
            ab[0] * ac[1] - ab[1] * ac[0],
        ]
        for index in (i0, i1, i2):
            for axis in range(3):
                accumulated[index][axis] += face[axis]

    result = []
    for index, source in enumerate(normals):
        length = math.sqrt(sum(value * value for value in source))
        vector = source if length > 1e-8 else accumulated[index]
        length = math.sqrt(sum(value * value for value in vector))
        if length <= 1e-8:
            raise ValueError(f"{name}: cannot reconstruct normal for vertex {index}")
        result.append([value / length for value in vector])
    return result


def add_piece(doc, binary, piece, material_index):
    name = piece["name"]
    positions = piece["vertices"]
    normals = normalized_normals(positions, piece["normals"], piece["triangles"], name)
    uvs = [[uv[0], 1.0 - uv[1]] for uv in piece["uvs"]]
    triangles = piece["triangles"]
    finite_rows(positions, 3, f"{name} positions")
    finite_rows(normals, 3, f"{name} normals")
    finite_rows(uvs, 2, f"{name} uvs")
    if len(normals) != len(positions) or len(uvs) != len(positions):
        raise ValueError(f"{name}: attribute counts differ")
    if not triangles or any(len(tri) != 3 for tri in triangles):
        raise ValueError(f"{name}: malformed triangles")
    indices = flatten(triangles)
    if min(indices) < 0 or max(indices) >= len(positions):
        raise ValueError(f"{name}: triangle index out of range")

    pos_view = append_view(doc, binary, struct.pack(f"<{len(positions) * 3}f", *flatten(positions)), 34962)
    normal_view = append_view(doc, binary, struct.pack(f"<{len(normals) * 3}f", *flatten(normals)), 34962)
    uv_view = append_view(doc, binary, struct.pack(f"<{len(uvs) * 2}f", *flatten(uvs)), 34962)
    index_view = append_view(doc, binary, struct.pack(f"<{len(indices)}H", *indices), 34963)

    minimum = [min(row[i] for row in positions) for i in range(3)]
    maximum = [max(row[i] for row in positions) for i in range(3)]
    pos_acc = append_accessor(doc, pos_view, 5126, len(positions), "VEC3", minimum, maximum)
    normal_acc = append_accessor(doc, normal_view, 5126, len(normals), "VEC3")
    uv_acc = append_accessor(doc, uv_view, 5126, len(uvs), "VEC2")
    index_acc = append_accessor(doc, index_view, 5123, len(indices), "SCALAR", [min(indices)], [max(indices)])

    primitive = {
        "attributes": {"POSITION": pos_acc, "NORMAL": normal_acc, "TEXCOORD_0": uv_acc},
        "indices": index_acc,
        "material": material_index,
        "mode": 4,
    }
    doc.setdefault("meshes", []).append({"name": name, "primitives": [primitive]})
    mesh_index = len(doc["meshes"]) - 1
    doc.setdefault("nodes", []).append({"name": name, "mesh": mesh_index})
    node_index = len(doc["nodes"]) - 1
    doc["scenes"][doc.get("scene", 0)].setdefault("nodes", []).append(node_index)


def build_gender(gender: str, source_json: Path):
    base_path = CHARACTERS / f"{gender}_Average.glb"
    output_path = CHARACTERS / f"{gender}_Average_Studio.glb"
    doc, binary = parse_glb(base_path)
    pieces = {piece["name"]: piece for piece in json.loads(source_json.read_text())["pieces"]}
    existing_nodes = {node.get("name") for node in doc.get("nodes", [])}

    missing_source = [name for name in SLOTS if name not in pieces]
    if missing_source:
        raise ValueError(f"{source_json}: missing {', '.join(missing_source)}")

    material_by_slot = {}
    for node in doc.get("nodes", []):
        name = node.get("name", "")
        match = re.fullmatch(r"(Torso|Legs)[1-4]", name)
        if match:
            slot = match.group(1)
            primitive = doc["meshes"][node["mesh"]]["primitives"][0]
            material_by_slot[slot] = primitive["material"]
    if set(material_by_slot) != {"Torso", "Legs"}:
        raise ValueError(f"{base_path}: could not resolve torso/legs materials")

    for name in SLOTS:
        if name not in existing_nodes:
            slot = "Torso" if name.startswith("Torso") else "Legs"
            add_piece(doc, binary, pieces[name], material_by_slot[slot])

    final_names = {node.get("name") for node in doc.get("nodes", [])}
    missing_output = [name for name in SLOTS if name not in final_names]
    if missing_output:
        raise AssertionError(f"output missing: {', '.join(missing_output)}")
    apply_handedness_conversion(doc)
    output_path.write_bytes(pack_glb(doc, binary))
    print(f"{output_path.relative_to(ROOT)}: {output_path.stat().st_size:,} bytes")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--female-json", type=Path, required=True)
    parser.add_argument("--male-json", type=Path, required=True)
    args = parser.parse_args()
    build_gender("f", args.female_json)
    build_gender("m", args.male_json)


if __name__ == "__main__":
    main()
