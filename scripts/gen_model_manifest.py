#!/usr/bin/env python3
"""Regenerate models/models_manifest.json from the GLBs on disk.

Scans production-calculator/models/ for *.glb (excluding utility meshes),
computes dims/nodes/lods from the embedded glTF, and records texture info
from the skin-resolution sidecar written by the batch converter.
"""
import json
import os
import re
import struct
import sys
from collections import Counter

REPO = '/home/hermes-agent/projects/production-calculator'
MODELS = os.path.join(REPO, 'models')
SKIP = {'1x1_square', 'clouds', 'default', 'skybox', 'sphere'}

# weapon id → display name from the calculator's game data
WEAPON_NAMES = {}
try:
    GD = json.load(open(os.path.join(REPO, 'data', 'game_data.json')))
    WEAPON_NAMES = GD.get('weapon_names', {}) or {}
except Exception:
    pass

FACTIONS = ['GOM', 'LED', 'VTX', 'CMG', 'EC', 'MOB', 'BOS', 'FDC']
SPECIAL_MODELS = {
    # Clothing skins use the male torso mesh as their viewer geometry; keep
    # the in-game item name rather than exposing the generated asset filename.
    'Ryubusa_Jacket_Male': ('Ryubusa Jacket (Male)', '635'),
}


def read_glb_stats(path):
    data = open(path, 'rb').read()
    try:
        jlen = struct.unpack('<I', data[12:16])[0]
        gltf = json.loads(data[20:20 + jlen])
    except Exception:
        return None
    nodes = len(gltf.get('nodes', []))
    lods = 0
    bounds_min = [float('inf')] * 3
    bounds_max = [float('-inf')] * 3
    for mesh in gltf.get('meshes', []):
        for prim in mesh.get('primitives', []):
            acc = prim.get('attributes', {}).get('POSITION')
            if acc is None:
                continue
            a = gltf['accessors'][acc]
            if 'min' in a and 'max' in a:
                for i in range(3):
                    bounds_min[i] = min(bounds_min[i], a['min'][i])
                    bounds_max[i] = max(bounds_max[i], a['max'][i])
    # count distinct meshes sharing a name prefix pattern? Just use mesh count
    lods = len(gltf.get('meshes', []))
    dims = None if bounds_min[0] == float('inf') else [
        round(bounds_max[i] - bounds_min[i], 1) for i in range(3)]
    return nodes, lods, dims


def main():
    previous = {}
    old_manifest = os.path.join(MODELS, 'models_manifest.json')
    try:
        old = json.load(open(old_manifest))
        previous = {e.get('file'): e for e in old.get('models', []) if e.get('file')}
    except (OSError, ValueError, TypeError):
        pass
    entries = []
    for root, _d, files in os.walk(MODELS):
        for fn in sorted(files):
            if not fn.endswith('.glb'):
                continue
            rel = os.path.relpath(os.path.join(root, fn), MODELS)
            parts = rel.split(os.sep)
            cat = parts[0] if len(parts) > 1 else 'Misc'
            name = os.path.splitext(parts[-1])[0]
            if name in SKIP:
                continue
            p = os.path.join(root, fn)
            stats = read_glb_stats(p)
            if stats is None:
                print(f'  skip (bad glb): {rel}')
                continue
            nodes, lods, dims = stats
            entry = {
                'file': rel,
                'name': name,
                'category': cat,
                'bytes': os.path.getsize(p),
            }
            special = SPECIAL_MODELS.get(name)
            if special:
                entry['name'], entry['item_id'] = special
                entry['game_category'] = 'Clothing'
            # weapon display names: w#_hh / w#_hh2 / w# and named variants
            # such as w20_hh_powerpuff → game weapon_names
            wm = re.match(r'^(w\d+)(?:_hh2?(?:_.+)?)?$', name)
            weapon_id = wm.group(1) if wm else None
            if weapon_id and weapon_id in WEAPON_NAMES:
                # skip _hh2 duplicates: alternate geometry for the same
                # weapon with no own skin → renders broken when forced onto
                # the base _hh texture (mismatched UVs). One model per weapon.
                if re.match(r'^w\d+_hh2(?:_|$)', name):
                    continue
                entry['name'] = WEAPON_NAMES[weapon_id]
                entry['weapon_id'] = weapon_id
                entry['game_category'] = 'Weapons'
                base_name = weapon_id + '_hh'
                if name not in (weapon_id, base_name):
                    suffix = name[len(base_name):].lstrip('_')
                    if suffix:
                        entry['name'] += ' (' + suffix.replace('_', ' ') + ')'
            # faction armor variants: <Piece>__<FACTION> → "TorsoArmour6 (GOM)"
            fm = re.match(r'^(.+)__([A-Z]{3})$', name)
            if fm and fm.group(2) in FACTIONS:
                entry['name'] = fm.group(1) + ' (' + fm.group(2) + ')'
                entry['faction'] = fm.group(2)
            if dims:
                entry['dims'] = dims
            if nodes:
                entry['nodes'] = nodes
            if lods:
                entry['lods'] = lods
            # texture info from sidecar (batch writes <name>.texinfo.json next to GLB)
            texinfo = os.path.join(root, os.path.splitext(fn)[0] + '.texinfo.json')
            if os.path.exists(texinfo):
                ti = json.load(open(texinfo))
                if ti.get('textures'):
                    entry['textures'] = ti['textures']
                    entry['textured'] = True
            # Preserve curated game categories and metadata when the raw GLB
            # manifest is regenerated. The enrichment pass is intentionally
            # separate, but a new GLB must not erase prior classification.
            old_entry = previous.get(rel, {})
            for key in ('game_category', 'item_names', 'slot', 'faction', 'piece_base'):
                if key in old_entry and key not in entry:
                    entry[key] = old_entry[key]
            entries.append(entry)

    entries.sort(key=lambda e: (e['category'], e['name']))
    manifest = {'generated': '2026-08-05', 'models': entries}
    out = os.path.join(MODELS, 'models_manifest.json')
    with open(out, 'w') as f:
        json.dump(manifest, f, indent=1)
    print(f'{len(entries)} models → {out}')
    print(Counter(e['category'] for e in entries))
    tex = sum(1 for e in entries if e.get('textured'))
    print(f'textured: {tex} / {len(entries)}')


if __name__ == '__main__':
    main()
