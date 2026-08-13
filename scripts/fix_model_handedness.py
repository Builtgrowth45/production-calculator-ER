#!/usr/bin/env python3
"""Convert LithTech/DirectX left-handed GLBs to glTF right-handed space.

The original asset pipeline copied LTA/LTB coordinates into glTF verbatim. This
wraps every glTF scene in an X-axis reflection so asymmetric geometry and
horizontal texture markings render on the correct side. The conversion is
stored in each GLB, not applied by the calculator viewer.

The operation is idempotent: converted scenes are detected by a named root
node and left unchanged.

Usage:
  python3 scripts/fix_model_handedness.py --all
  python3 scripts/fix_model_handedness.py models/Items/w3_hh.glb
  python3 scripts/fix_model_handedness.py --check --all
"""
from __future__ import annotations

import argparse
import json
import os
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODELS = ROOT / "models"
CONVERSION_NODE_NAME = "__lithtech_lh_to_gltf_rh__"
CONVERSION_SCALE = [-1.0, 1.0, 1.0]
JSON_CHUNK = 0x4E4F534A


def _is_conversion_node(document: dict, node_index: int) -> bool:
    nodes = document.get("nodes", [])
    if not isinstance(node_index, int) or not 0 <= node_index < len(nodes):
        return False
    node = nodes[node_index]
    return (
        node.get("name") == CONVERSION_NODE_NAME
        and node.get("scale") == CONVERSION_SCALE
    )


def apply_handedness_conversion(document: dict) -> bool:
    """Wrap each unconverted scene's roots in an X-reflection node."""
    scenes = document.get("scenes", [])
    nodes = document.setdefault("nodes", [])
    changed = False

    for scene in scenes:
        roots = list(scene.get("nodes", []))
        conversion_roots = [root for root in roots if _is_conversion_node(document, root)]
        if len(roots) == 1 and len(conversion_roots) == 1:
            continue
        if len(conversion_roots) == 1:
            conversion_index = conversion_roots[0]
            unconverted_roots = [root for root in roots if root != conversion_index]
            nodes[conversion_index].setdefault("children", []).extend(unconverted_roots)
            scene["nodes"] = [conversion_index]
            changed = True
            continue
        conversion_node = {
            "name": CONVERSION_NODE_NAME,
            "scale": CONVERSION_SCALE.copy(),
            "children": roots,
            "extras": {"sourceCoordinateSystem": "LithTech DirectX left-handed"},
        }
        nodes.append(conversion_node)
        scene["nodes"] = [len(nodes) - 1]
        changed = True

    return changed


def is_converted(document: dict) -> bool:
    scenes = document.get("scenes", [])
    return bool(scenes) and all(
        len(scene.get("nodes", [])) == 1
        and _is_conversion_node(document, scene["nodes"][0])
        for scene in scenes
    )


def parse_glb(path: Path) -> tuple[dict, list[tuple[int, bytes]]]:
    data = path.read_bytes()
    if len(data) < 20 or data[:4] != b"glTF":
        raise ValueError(f"not a GLB: {path}")
    version, declared_length = struct.unpack_from("<II", data, 4)
    if version != 2 or declared_length != len(data):
        raise ValueError(f"invalid glTF 2 GLB header: {path}")

    chunks = []
    document = None
    offset = 12
    while offset < len(data):
        if offset + 8 > len(data):
            raise ValueError(f"truncated GLB chunk header: {path}")
        length, chunk_type = struct.unpack_from("<II", data, offset)
        start = offset + 8
        end = start + length
        if end > len(data):
            raise ValueError(f"truncated GLB chunk: {path}")
        payload = data[start:end]
        if chunk_type == JSON_CHUNK:
            if document is not None:
                raise ValueError(f"multiple JSON chunks: {path}")
            document = json.loads(payload.decode("utf-8").rstrip(" \t\r\n\x00"))
        else:
            chunks.append((chunk_type, payload))
        offset = end

    if document is None:
        raise ValueError(f"missing JSON chunk: {path}")
    return document, chunks


def pack_glb(document: dict, chunks: list[tuple[int, bytes]]) -> bytes:
    json_payload = json.dumps(document, separators=(",", ":")).encode("utf-8")
    json_payload += b" " * ((-len(json_payload)) % 4)
    packed_chunks = [struct.pack("<II", len(json_payload), JSON_CHUNK), json_payload]
    for chunk_type, payload in chunks:
        padding = b"\x00" * ((-len(payload)) % 4)
        payload = payload + padding
        packed_chunks.extend((struct.pack("<II", len(payload), chunk_type), payload))
    body = b"".join(packed_chunks)
    return struct.pack("<4sII", b"glTF", 2, 12 + len(body)) + body


def convert_file(path: Path) -> bool:
    document, chunks = parse_glb(path)
    if not apply_handedness_conversion(document):
        return False
    output = pack_glb(document, chunks)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_bytes(output)
    os.replace(temporary, path)
    return True


def selected_paths(arguments) -> list[Path]:
    paths = [Path(value).resolve() for value in arguments.paths]
    if arguments.all:
        paths.extend(MODELS.rglob("*.glb"))
    unique = sorted(set(paths))
    if not unique:
        raise SystemExit("provide GLB paths or --all")
    return unique


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("paths", nargs="*")
    parser.add_argument("--all", action="store_true", help="process every models/**/*.glb")
    parser.add_argument("--check", action="store_true", help="verify only; do not modify files")
    arguments = parser.parse_args()

    paths = selected_paths(arguments)
    changed = 0
    failures = []
    for path in paths:
        try:
            if arguments.check:
                document, _ = parse_glb(path)
                if not is_converted(document):
                    failures.append(path)
            elif convert_file(path):
                changed += 1
        except (OSError, ValueError, json.JSONDecodeError) as error:
            print(f"ERROR {path}: {error}")
            failures.append(path)

    if arguments.check:
        if failures:
            print(f"handedness check failed: {len(failures)}/{len(paths)} GLBs unconverted or invalid")
            return 1
        print(f"handedness check passed: {len(paths)} GLBs")
        return 0

    if failures:
        print(f"conversion failed: {len(failures)}/{len(paths)} GLBs")
        return 1
    print(f"converted {changed} GLBs; {len(paths) - changed} already converted")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
