#!/usr/bin/env python3
"""enrich_manifest_game.py — add game-category + item-name mapping to the
model manifest so the Models tab can be organized by the calculator's own
categories (Armor/Guns/Ammunition/...) instead of client-file categories.

For each manifest model, try to resolve:
  game_category  — the calculator's category for the item this model shows
  item_names    — calculator item name(s) the model represents (armor pieces
                  map to their slot's item names, weapons via weapon_names)
  slot          — armor slot (helmet/leg pads/torso/...) for armor pieces
"""
import json
import os
import re

REPO = '/home/hermes-agent/projects/production-calculator'
GD = json.load(open(os.path.join(REPO, 'data', 'game_data.json')))
MAN = os.path.join(REPO, 'models', 'models_manifest.json')

SLOT_KEYWORDS = [
    ('helmet', 'Helmet'),
    ('arm pad', 'ArmPads'),
    ('glove', 'Hands'),
    ('leg pad', 'LegPads'),
    ('shoulder', 'ShoulderPads'),
    ('torso', 'Torso'),
    ('shoes', 'Shoes'),
    ('glasses', 'Glasses'),
]
SLOT_MODEL_PREFIX = {
    'Helmet': 'Helmet', 'ArmPads': 'ArmPads', 'Hands': 'Hands',
    'LegPads': 'LegPads', 'ShoulderPads': 'ShoulderPads', 'Torso': 'Torso',
    'Shoes': 'Shoes', 'Glasses': 'Glasses',
}


def item_index():
    """name(lower) -> {name, category, slot}"""
    idx = {}
    for r in GD.get('recipes', []):
        out = r.get('output', {})
        n = out.get('item', '')
        if not n:
            continue
        low = n.lower()
        if low in idx:
            continue
        cat = out.get('category', '')
        slot = None
        for kw, _ in SLOT_KEYWORDS:
            if kw in low:
                slot = kw.replace(' ', '')
                break
        idx[low] = {'name': n, 'category': cat, 'slot': slot}
    for i in GD.get('inventory', []):
        n = i.get('name', '')
        if n and n.lower() not in idx:
            idx[n.lower()] = {'name': n, 'category': i.get('category', 'Material'),
                              'slot': None}
    return idx


def weapon_lookup():
    """weapon display name(lower) -> w#"""
    wn = GD.get('weapon_names', {}) or {}
    return {v.lower(): k for k, v in wn.items()}


def main():
    items = item_index()
    wlook = weapon_lookup()
    m = json.load(open(MAN))['models']

    for e in m:
        low = e['name'].lower()
        if e.get('weapon_id'):
            e['game_category'] = 'Weapons'
        elif low in items:
            it = items[low]
            e['game_category'] = it['category'] or 'Client Assets'
            if it['slot']:
                e['slot'] = it['slot']
        elif low in wlook:
            e['game_category'] = 'Weapons'
        else:
            # known item-model → game category (client model names that map
            # to calculator categories without exact name matches)
            ITEM_CAT = {
                'beer': 'Food & Drink', 'burger': 'Food & Drink',
                'can': 'Food & Drink', 'cup': 'Food & Drink',
                'duddal': 'Food & Drink', 'pizza': 'Food & Drink',
                'sushi': 'Food & Drink', 'dice': 'Food & Drink',
                'medikit_s': 'Medical', 'medikit_m': 'Medical',
                'medikit_l': 'Medical', 'medikit_xl': 'Medical',
                'biocell': 'Medical', 'energycell': 'Ammunition',
                'mag_6mm': 'Ammunition', 'mag_762mm': 'Ammunition',
                'mag_9mm': 'Ammunition',
                'drug_inhilator': 'Drugs', 'drug_injector': 'Drugs',
                'drug_pills': 'Drugs', 'injector': 'Medical',
                'miningtool': 'Tools', 'miningtool2': 'Tools',
                'miningtool3': 'Tools', 'scanner': 'Tools',
                'hackingdevice': 'Tools', 'nightvision': 'Tools',
                'covershield': 'Tools', 'shield': 'Tools',
                'shield_player': 'Tools', 'shoulderlamp': 'Tools',
                'stamina': 'Medical', 'resistance': 'Medical',
                'vortex_implant': 'Implants & Electronics',
                'hat1_1': 'Clothing', 'hat2_1': 'Clothing',
                'hat2': 'Clothing', 'hat3': 'Clothing', 'hat4': 'Clothing',
                'hat5': 'Clothing', 'hat6': 'Clothing', 'hat7': 'Clothing',
                'hat8': 'Clothing',
                'rock': 'Material', 'rock1': 'Material', 'rock2': 'Material',
                'rock3': 'Material', 'shell': 'Material',
                'w23': 'Weapons',
                'ticket': 'Misc', 'vest': 'Clothing',
                'bagpack1_1': 'Clothing', 'bagpack1_2': 'Clothing',
                'bagpack2': 'Clothing', 'easteregg': 'Misc',
                'dummy': 'Misc',
            }
            if low in ITEM_CAT:
                e['game_category'] = ITEM_CAT[low]
                e['slot'] = None
            elif re.match(r'^([a-z]+)(\d+)$', low) or \
                 re.match(r'^[fm]_([a-z]+)(\d+)$', low):
                # armor piece models: ArmPads1, Helmet3, f_Shoes1, TorsoArmour2...
                piece_match = re.match(r'^([a-z]+)(\d+)$', low) or \
                              re.match(r'^[fm]_([a-z]+)(\d+)$', low)
                base = piece_match.group(1).lower()
                slot_map = {'helmet': 'Helmet', 'armpads': 'ArmPads',
                            'hands': 'Hands', 'legs': 'Legs',
                            'legpads': 'LegPads',
                            'shoulderpads': 'ShoulderPads', 'torso': 'Torso',
                            'shoes': 'Shoes', 'glasses': 'Glasses',
                            'torsoarmour': 'TorsoArmour', 'gloves': 'Hands'}
                slot = slot_map.get(base)
                if slot:
                    e['game_category'] = 'Armor'
                    e['slot'] = base
                    e['piece_base'] = slot
                else:
                    # not an armor piece (e.g. 'alk1') — keep client category
                    e['game_category'] = e['category']
            else:
                # faction variant: "TorsoArmour6__EC" or "TorsoArmour6 (EC)"
                # (faction codes are 2-3 letters: EC is 2!)
                fv = re.match(r'^(.+?)__([A-Z]{2,3})$', e['name']) or \
                     re.match(r'^(.+?) \(([A-Z]{2,3})\)$', e['name'])
                if fv:
                    piece_match2 = re.match(r'^([a-z]+)(\d+)$', fv.group(1).lower())
                    if piece_match2:
                        e['game_category'] = 'Armor'
                        e['slot'] = piece_match2.group(1).lower()
                        e['piece_base'] = piece_match2.group(1).capitalize()
                        e['faction'] = fv.group(2)
                    else:
                        e['game_category'] = 'Client Assets'
                else:
                    # client-only assets (props, furniture, chars, enemies)
                    e['game_category'] = e['category']  # keep client category as label

    out = {'generated': '2026-08-05', 'source': 'enriched',
           'models': m}
    with open(MAN, 'w') as f:
        json.dump(out, f, indent=1)

    from collections import Counter
    cats = Counter(e.get('game_category', '?') for e in m)
    print(f'{len(m)} models')
    for c, n in cats.most_common():
        print(f'  {c}: {n}')


if __name__ == '__main__':
    main()
