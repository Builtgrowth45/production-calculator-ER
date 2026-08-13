#!/usr/bin/env python3
"""update_balance_stats.py — fetch the live ER Balance Sheet, ingest it into
data/balance_stats.json, and merge the stats into data/game_data.json recipes.

The Google Sheet is the AUTHORITATIVE live combat-stats source (Chris 2026-08-11).
On conflicts between an existing recipe output.stats value and the sheet, the
SHEET wins; recipe-only keys (staminaregen, auraregen, addictiontreatment,
addiction, illegal, drains, blockrating, critoffenserating) are preserved.

Run:  python3 scripts/update_balance_stats.py
"""
import csv, json, re, sys, urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
URL = ("https://docs.google.com/spreadsheets/d/e/2PACX-1vT_DqXbgxfJmrzLJvFov-iqiRwPeSDpaqk_r3fVqfn7-8bfjAgT2ZWfQLiM_D41thtJE-LO5CtHWt50/"
       "pub?gid=29503079&single=true&output=csv")

# ── 1. Fetch ────────────────────────────────────────────────────────────────
req = urllib.request.Request(URL, headers={'User-Agent': 'Mozilla/5.0'})
csv_text = urllib.request.urlopen(req, timeout=30).read().decode('utf-8-sig')
rows = list(csv.DictReader(csv_text.splitlines()))
print(f"[1] fetched {len(rows)} rows from live sheet")

# ── 2. Dedupe identical rows ────────────────────────────────────────────────
seen, uniq = set(), []
for r in rows:
    sig = (r['Name'], tuple(sorted((k, v) for k, v in r.items() if k not in ('', 'Name') and str(v).strip())))
    if sig in seen: continue
    seen.add(sig); uniq.append(r)
print(f"[2] deduped -> {len(uniq)} unique rows ({len(rows) - len(uniq)} identical dupes dropped)")

# ── 3. Stat key mapping ─────────────────────────────────────────────────────
SHEET_KEY_TO_STAT = {
    'Agility': 'agility', 'BallisticDamage': 'ballisticdamage', 'Destruction': 'destruction',
    'XenoDamage': 'xenodamage', 'EnergyDamage': 'energydamage', 'BioDamage': 'biodamage',
    'StaminaDamage': 'staminadamage', 'AuraDamage': 'auradamage', 'Health': 'health',
    'Stamina': 'stamina', 'Aura': 'aura', 'BioRegen': 'bioregen', 'HealthRegen': 'healthregen',
    'ProtectionReduction': 'protectionreduction', 'Armor': 'armor', 'Shielding': 'shielding',
    'Endurance': 'endurance', 'Reflection': 'reflection', 'Resistance': 'resistance',
    'DefenseRating': 'defenserating', 'DurationSeconds': 'durationseconds',
    'MedkitCooldown': 'medkitcooldown', 'WeaponRecoil': 'weaponrecoil', 'Classification': 'classification',
}

def sheet_stats(r):
    out = {}
    for k, v in r.items():
        if k in ('', 'Name'): continue
        sk = SHEET_KEY_TO_STAT.get(k)
        if not sk or not str(v).strip(): continue
        try:
            f = float(v)
            out[sk] = int(f) if f == int(f) else round(f, 2)
        except ValueError:
            continue
    return out

# ── 4. Write data/balance_stats.json ────────────────────────────────────────
items = [{'name': r['Name'], 'stats': sheet_stats(r)} for r in uniq]
payload = {
    '_meta': {
        'source': 'ER - Balance Sheet (Google Sheets, gid=29503079, pubhtml)',
        'fetched': date.today().isoformat(),
        'rows_raw': len(rows), 'rows_unique': len(uniq),
        'note': 'Live combat stats — authoritative for recipe output.stats.',
    },
    'items': items,
}
bal_path = ROOT / 'data' / 'balance_stats.json'
bal_path.write_text(json.dumps(payload, indent=2))
print(f"[4] wrote data/balance_stats.json ({len(items)} items)")

# ── 5. Merge into recipes ───────────────────────────────────────────────────
def norm(s):
    s = s.lower()
    s = re.sub(r'\s*\((male|female)\)', '', s)
    s = re.sub(r'[^a-z0-9]+', ' ', s).strip()
    # Recipe list spells it "medkit" (small/battle/emergency medkit); sheet
    # uses "Medikit" — the medkit/MediKit/medikit spelling zoo.
    s = re.sub(r'med\s?ikit', 'medkit', s)
    return s

# Sheet-name -> recipe-name alias table. Since 2026-08-11 the recipes carry the
# sheet's names (rename_items.py), so only the sheet's OWN typos need mapping:
#   - "Minimist" is the sheet's typo for the client's "Minimalist" (prodschema 441/476)
#   - "Pythica Sustained Gloves" drops "Battle" (client 420 says Sustained Battle)
ALIASES = {
    'infensus minimist gloves': 'infensus minimalist gloves',
    'pythica sustained gloves': 'pythica sustained battle gloves',
}
def resolve(n):
    return ALIASES.get(n, n)

game_path = ROOT / 'data' / 'game_data.json'
data = json.loads(game_path.read_text())

# recipe lookup by normalized name
recipe_by_norm = {}
for r in data['recipes']:
    recipe_by_norm.setdefault(norm(r['output']['item']), []).append(r)

def find_recipe(sheet_name):
    """Best-effort recipe lookup: alias-resolved normalized exact match."""
    rn = resolve(norm(sheet_name))
    if rn in recipe_by_norm:
        return recipe_by_norm[rn][0]
    return None

stats_added = []   # recipe got a stats block where it had none (or empty)
stats_updated = [] # recipe stats changed value(s)
matched_names = set()
for it in items:
    if not it['stats']: continue
    rec = find_recipe(it['name'])
    if not rec: continue
    matched_names.add(rec['output']['item'])
    old = rec['output'].get('stats') or {}
    new = dict(old)
    changed = False
    for k, v in it['stats'].items():
        if old.get(k) != v:
            new[k] = v
            changed = True
    if changed:
        rec['output']['stats'] = new
        if not old:
            stats_added.append(rec['output']['item'])
        else:
            stats_updated.append(rec['output']['item'])

# round-trip write (indent=1 is the canonical format — verified 2026-08-08)
out = json.dumps(data, indent=1)
if out + '\n' != game_path.read_text() and out != game_path.read_text():
    game_path.write_text(out)
    # verify the new file still round-trips
    assert json.dumps(json.loads(game_path.read_text()), indent=1) == game_path.read_text(), "round-trip broken!"
    print("[5] merged stats into data/game_data.json")
else:
    print("[5] no recipe stats changed")

print(f"    recipes matched: {len(matched_names)}")
print(f"    stats block ADDED (was empty): {len(stats_added)}")
for n in sorted(stats_added): print(f"      + {n}")
print(f"    stats UPDATED: {len(stats_updated)}")
for n in sorted(stats_updated): print(f"      ~ {n}")

unmatched = [it['name'] for it in items if it['stats'] and not find_recipe(it['name'])]
print(f"    sheet items with stats but NO recipe (reference-only): {len(unmatched)}")
