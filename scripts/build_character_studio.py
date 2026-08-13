#!/usr/bin/env python3
"""
scripts/build_character_studio.py — Character Studio skin assets

Scans the extracted client skin folders (Skins/Characters/<FACTION>/) for
AVG clothing skins (f_AVG_* / m_AVG_* torso+legs), converts each PNG to
WebP (q82, ~10% of original size) into models/skins/<FACTION>/, and writes
models/character_skins.json — the manifest the Character Studio tab reads.

Usage:  python3 scripts/build_character_studio.py
"""
import io, json, os, re, sys
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = "/home/hermes/workspace/game-client/extracted/textures/Resources/Skins/Characters"
OUT = os.path.join(REPO, "models", "skins")
MANIFEST = os.path.join(REPO, "models", "character_skins.json")
QUALITY = 82
SKIN_RE = re.compile(r"^([fm])_AVG_(Torso|Legs)(\d+)_([A-Za-z0-9]+)(?:\.png)?$", re.I)  # f_AVG_Torso2_4 / f_AVG_Torso1_Black

def main():
    if not os.path.isdir(SRC):
        sys.exit(f"source skin dir not found: {SRC}")
    os.makedirs(OUT, exist_ok=True)
    factions = {}
    total_in = total_out = 0

    for faction in sorted(os.listdir(SRC)):
        fdir = os.path.join(SRC, faction)
        if not os.path.isdir(fdir):
            continue
        slots = {"f": {"Torso": {}, "Legs": {}}, "m": {"Torso": {}, "Legs": {}}}
        out_dir = os.path.join(OUT, faction)
        os.makedirs(out_dir, exist_ok=True)

        for fn in sorted(os.listdir(fdir)):
            m = SKIN_RE.match(fn)
            if not m or not fn.endswith(".png"):
                continue
            gender, slot, style, variant = m.groups()
            slot = slot.capitalize()  # 'legs' -> 'Legs' (VTX has a lowercase file)
            total_in += 1
            webp_name = fn[:-4] + ".webp"
            src_path = os.path.join(fdir, fn)
            dst_path = os.path.join(out_dir, webp_name)
            try:
                with Image.open(src_path) as im:
                    if im.mode != "RGBA":
                        im = im.convert("RGBA")
                    buf = io.BytesIO()
                    im.save(buf, "WEBP", quality=QUALITY, method=6)
                with open(dst_path, "wb") as f:
                    f.write(buf.getvalue())
                total_out += os.path.getsize(dst_path)
            except Exception as e:
                print(f"  ! {faction}/{fn}: {e}", file=sys.stderr)
                continue
            label = f"{slot}{style}_{variant}"           # e.g. Torso2_4
            slots[gender][slot][label] = {"file": webp_name}

        # flatten per gender/slot: sorted variant lists
        factions[faction] = {
            g: {
                s: [slots[g][s][k] for k in sorted(slots[g][s])]
                for s in ("Torso", "Legs")
            }
            for g in ("f", "m")
        }
        n = sum(len(v) for g in factions[faction].values() for v in g.values())
        print(f"{faction:12} {n:3} skins")

    manifest = {
        "generated": "2026-08-08",
        "source": "client Skins/Characters/<FACTION>/ AVG clothing skins (PNG→WebP q82)",
        "factions": factions,
    }
    with open(MANIFEST, "w") as f:
        json.dump(manifest, f, indent=1)
    print(f"\n{total_in} skins converted, {total_out/1e6:.1f} MB WebP -> {OUT}")
    print(f"manifest -> {MANIFEST}")

if __name__ == "__main__":
    main()
