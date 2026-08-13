#!/usr/bin/env python3
"""rename_items.py — apply the ER-name renames to the calculator dataset.

Sheet name is canonical (Chris: "The live sheet is correct. Fix the names.").
Tiebreaker for the sheet's own typos (Premet/Minimist/Medikit casing, missing
"Battle") is the client prodschema (forum 308): the sheet's minority spellings
lose to the client's.

Renames:
  - "X Torso" → "X Torso Armor" (36)
  - "Detox X" → "Detox Combat X" (6, incl. Detox Torso → Detox Combat Torso Armor)
  - Amyl/Butyl Nitrite → Nitrate (sheet)
  - Infostyle Gloves Gloves → Infostyle Gloves (sheet + prodschema 412)
  - Doa 187 → DOA 187 (sheet + prodschema 12)
  - Cryotech → CryoTech (prodschema 65/70; sheet has CryoTech Medigun)
  - Locans Stabilized Shoulder → Shoulder Pads (sheet + prodschema 247)
  - small/battle/emergency medkit → Small/Battle/Emergency MediKit (prodschema 81-84;
    casing consistent with existing Standard MediKit)

Ripples handled: game_data.json (recipe output.item, weapon_names, drugs),
costs.json + src/costs.js (items keys), icons (git mv + icon_catalog.json +
icon_hashes.json), shared_gear_sets.json + shared_inventory.json, academy/*.md.
"""
import json, re, subprocess, os, sys
from pathlib import Path

ROOT = Path('/home/hermes/workspace/production-calculator')
os.chdir(ROOT)

# ── Build the rename map ────────────────────────────────────────────────────
gd = json.load(open('data/game_data.json'))
recipe_names = {r['output']['item'] for r in gd['recipes']}
RENAMES = {}
for r in gd['recipes']:
    n = r['output']['item']
    if n.endswith(' Torso'):
        RENAMES[n] = n + ' Armor'
for n in ['Detox Arm Pads','Detox Gloves','Detox Helmet','Detox Leg Pads','Detox Shoulder Pads']:
    if n in recipe_names:
        RENAMES[n] = 'Detox Combat ' + n.split(' ', 1)[1]
if 'Detox Torso' in recipe_names:
    RENAMES['Detox Torso'] = 'Detox Combat Torso Armor'
RENAMES.update({
    'Amyl Nitrite': 'Amyl Nitrate',
    'Butyl Nitrite': 'Butyl Nitrate',
    'Infostyle Gloves Gloves': 'Infostyle Gloves',
    'Doa 187': 'DOA 187',
    'Cryotech Healing Cell': 'CryoTech Healing Cell',
    'Cryotech CM2 Healing Cell': 'CryoTech CM2 Healing Cell',
    'Locans Stabilized Shoulder': 'Locans Stabilized Shoulder Pads',
    'small medkit': 'Small MediKit',
    'battle medkit': 'Battle MediKit',
    'emergency medkit': 'Emergency MediKit',
})
# validate: every old name must exist, no new name may collide
for old in RENAMES:
    assert old in recipe_names, f"NO RECIPE '{old}'"
for new in RENAMES.values():
    assert new not in recipe_names, f"COLLISION: '{new}' already a recipe"
print(f"[0] {len(RENAMES)} renames")

def apply(text, names_only=True):
    for old, new in RENAMES.items():
        text = text.replace(f'"{old}"', f'"{new}"')
    return text

# ── 1. game_data.json ───────────────────────────────────────────────────────
def walk(obj):
    if isinstance(obj, dict):
        for k, v in list(obj.items()):
            if k == 'item' and isinstance(v, str) and v in RENAMES:
                obj[k] = RENAMES[v]
            else:
                walk(v)
    elif isinstance(obj, list):
        for v in obj:
            walk(v)
walk(gd)
# weapon_names dict values
for k, v in list(gd.get('weapon_names', {}).items()):
    if v in RENAMES:
        gd['weapon_names'][k] = RENAMES[v]
# drugs list (dicts with 'name')
for d in gd['drugs']:
    if d.get('name') in RENAMES:
        d['name'] = RENAMES[d['name']]
out = json.dumps(gd, indent=1)
assert json.dumps(json.loads(out), indent=1) == out
open('data/game_data.json', 'w').write(out)
print("[1] game_data.json renamed")

# ── 2. costs.json + src/costs.js (identical payloads) ───────────────────────
costs = json.load(open('data/costs.json'))
costs['items'] = {RENAMES.get(k, k): v for k, v in costs['items'].items()}
costs['materials'] = {RENAMES.get(k, k): v for k, v in costs['materials'].items()}
cjson = json.dumps(costs, indent=2)
open('data/costs.json', 'w').write(cjson)
open('src/costs.js', 'w').write(f"// GENERATED — mirror of data/costs.json (hand-edit BOTH or re-run the pipeline)\nwindow.COSTS = {cjson};\n")
print("[2] costs.json + src/costs.js renamed (payloads identical)")

# ── 3. Icons: git mv files, update catalog + hashes ─────────────────────────
ic = json.load(open('icons/icon_catalog.json'))
renamed_icons = []
for entry in ic['icons']:
    if entry.get('name') in RENAMES:
        old_n = entry['name']
        new_n = RENAMES[old_n]
        old_icon = entry.get('icon') or (old_n.lower() + '.png')
        new_icon = new_n.lower() + '.png'
        entry['name'] = new_n
        entry['id'] = new_n.lower()
        entry['icon'] = new_icon
        renamed_icons.append((old_icon, new_icon))
for old_f, new_f in renamed_icons:
    old_p = Path('icons') / old_f
    new_p = Path('icons') / new_f
    if old_p.exists() and not new_p.exists():
        subprocess.run(['git', 'mv', str(old_p), str(new_p)], check=True)
        print(f"    git mv {old_f} -> {new_f}")
    elif not old_p.exists():
        print(f"    (no icon file for {old_f})")
ic['count'] = len(ic['icons'])
open('icons/icon_catalog.json', 'w').write(json.dumps(ic, indent=1))
print(f"[3a] icon_catalog.json renamed ({len(renamed_icons)} icons)")

ih = json.load(open('data/icon_hashes.json'))
ih = {RENAMES.get(k, k): v for k, v in ih.items()}
open('data/icon_hashes.json', 'w').write(json.dumps(ih, indent=1))
print("[3b] icon_hashes.json renamed")

# ── 4. Shared data ──────────────────────────────────────────────────────────
for fn in ['data/shared_gear_sets.json', 'data/shared_inventory.json']:
    if not Path(fn).exists(): continue
    d = json.load(open(fn))
    walk(d)  # renames any 'item' keys; gear sets use gear{slot: name} — handle below
    # shared_gear_sets gear dict values are item names (keyed by slot, not 'item')
    def walk_names(obj):
        if isinstance(obj, dict):
            for k, v in list(obj.items()):
                if k == 'gear' and isinstance(v, dict):
                    for slot, name in list(v.items()):
                        if name in RENAMES:
                            v[slot] = RENAMES[name]
                else:
                    walk_names(v)
        elif isinstance(obj, list):
            for v in obj:
                walk_names(v)
    walk_names(d)
    open(fn, 'w').write(json.dumps(d, indent=1))
    print(f"[4] {fn} renamed")

# ── 5. academy docs (markdown) ──────────────────────────────────────────────
for md in sorted(Path('academy').glob('*.md')):
    text = md.read_text()
    new = text
    for old, new_name in RENAMES.items():
        new = new.replace(old, new_name)  # plain-text: md uses **bold** etc.
    if new != text:
        md.write_text(new)
        print(f"[5] {md.name} renamed")

# ── 6. Report + verify ──────────────────────────────────────────────────────
print("\n=== verify: no old names remain in data/src (excluding generated mirrors) ===")
leftover = []
for fn in ['data/game_data.json', 'data/costs.json', 'src/costs.js', 'icons/icon_catalog.json',
           'data/icon_hashes.json', 'data/shared_gear_sets.json', 'data/shared_inventory.json']:
    t = open(fn).read()
    for old in RENAMES:
        if old in t:
            leftover.append((fn, old))
for fn, old in sorted(leftover):
    print(f"  LEFTOVER {old!r} in {fn}")
if not leftover:
    print("  clean")
