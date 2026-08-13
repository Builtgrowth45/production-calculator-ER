# 🧊 Models & Textures — How They Work in the Calculator

*Technical deep-dive: how the Empire Rising client's LTB models + DTX textures become the calculator's 3D gallery and gear paperdoll. Verified against repo state 2026-08-06.*

## The pipeline at a glance

```
Client assets (LithTech)                    Repo build artifacts              Runtime (browser)
────────────────────────                    ─────────────────────             ─────────────────
Resources/Models/*.ltb   ──(batch converter,──▶ models/**/*.glb  ──▶ three.js GLTFLoader ──▶ MODELS tab
                         │  external, not in repo)  + *.texinfo.json
Resources/Skins/*.dtx    ──(convert_dtx.py)──▶ PNGs (icons/,      ──▶ <img> in gear paperdoll,
                         │                     gear_textures/)        texture thumbs in workbench
data/game_data.json ────────────────────────▶ scripts/gen_model_manifest.py ─┐
                                              scripts/enrich_manifest_game.py ┘──▶ models/models_manifest.json
```

## 1. The client formats

- **LTB** — LithTech model/shader container. 483 in the client (`Models/Characters`, `Enemies`, `Items`, `Props`, `Einrichtung`, `ranks`). Binary; not directly usable in the browser.
- **DTX** — LithTech textures: DXT1/3/5 with a **fixed 164-byte header** (width @8, height @10, mips @12, BPPIdent @26; 4=DXT1, 5=DXT3, 6=DXT5). Decoded by `scripts/convert_dtx.py` (pure Python, verified against this client — 7,588/8,325 extracted).
- **Skins are factioned**: `Skins/Characters/<FACTION>/` where FACTION ∈ {BOS, CMG, EC, FDC, GOM, LED, MOB, VTX} + Civilian/General/Head/NPC. Every faction has 31 character slots + 35 item slots — that's how the same armor piece differs visually per faction.

## 2. LTB → GLB conversion (the missing tool)

The repo has the *outputs* (611 GLBs in `models/`, each with a `<name>.texinfo.json` sidecar listing its DTX textures) but **not the converter** — it ran on another machine (the scripts hardcode `REPO = '/home/hermes-agent/projects/production-calculator'`, which will break if run here). Sidecar shape:

```json
{"textures": ["1x1_square.dtx"]}
```

## 3. The manifest chain (two scripts)

**`gen_model_manifest.py`** → `models_manifest.json` (602 entries):
- Reads each GLB's embedded glTF JSON (chunk length @12–16, JSON @20) → `nodes`, `lods` (mesh count), `dims` (from POSITION accessor min/max)
- **Name → game data mapping** (this is the calculator tie-in):
  - `w\d+(_hh)?(_suffix)?` → `weapon_names` → display name; `_hh2` variants are **skipped** (alternate geometry, broken UVs against the `_hh` skin)
  - `<Piece>__<FACTION>` → "TorsoArmour6 (GOM)" style names
  - `SPECIAL_MODELS` override (e.g. `Ryubusa_Jacket_Male` → "Ryubusa Jacket (Male)", item id 635)
- Pulls `textures` + `textured` flag from the sidecar
- **Preserves curated metadata** (`game_category`, `item_names`, `slot`, `faction`, `piece_base`) from the previous manifest when regenerating

**`enrich_manifest_game.py`** → adds `game_category`/`item_names`/`slot`:
- Matches model names against `game_data.json` recipes (`SLOT_KEYWORDS`: helmet/arm pad/glove/leg pad/shoulder/torso/shoes/glasses → slots)
- ⚠️ Bug: iterates `GD.inventory` reading `i.get('name')` — but inventory entries use `"item"`, so inventory items never get indexed

**Manifest today:** 602 models — Armor 210, Props 202, Einrichtung 61, Weapons 28, Items 16, Characters 15, Clothing 13, Enemies 10, Medical 8, Tools 8, ranks 8, Food & Drink 7, Material 5, Ammo 4, Drugs 3, Misc 3, Implants 1. **562 textured (93%).**

## 4. The MODELS tab viewer (`src/views/models.js`)

- Loads `models/models_manifest.json`; gallery filterable by **game category** (curated order: Armor → Weapons → …), search, and "textured only"
- three.js scene: OrbitControls (damping + auto-rotate), hemisphere + key + rim lights, `fitCameraToObject` (FOV-aware framing for long-thin weapons), wireframe + manual vertex-normal lines helpers
- **Textures come embedded in the GLB** (`mt.map.image`); the workbench (`collectModelTextures`) lists them with dims, per-mesh piece breakdown (name/skin/vertex count), lightbox, **Export PNG**, and a client-side **4× upscale preview** (canvas resample + contrast boost) that re-imports live via `applyImportedTexture` — "mirrors what the server-side `tex_upscale.py` does for the final GLB rebuild" (that script is referenced but **not in the repo**)

## 5. The CHARACTER STUDIO (`src/views/character.js`) — NEW 2026-08-08

Dress-up tab on the MODELS view (subtab "🧍 Character Studio") — a fully-customizable character:

- **Body:** client-derived `Characters/f_Average_Studio.glb` / `m_Average_Studio.glb`. Each contains all eight numbered clothing silhouettes (`Torso1–4`, `Legs1–4`) plus the Average body's Helmet/TorsoArmour/ArmPads/LegPads/ShoulderPads/Glasses/Shoes/Hands/Hair/Face gear. Build from full-client LTB piece JSON with `scripts/build_character_studio_models.py`.
- **Skins:** `models/skins/<FACTION>/*.webp` — all 401 AVG clothing skins (torso+legs variants 1–4 incl. General Black/White) converted from the client's `Skins/Characters/<FACTION>/` PNGs (127 MB → **14.2 MB WebP q82**) by `scripts/build_character_studio.py`; index in `models/character_skins.json`
- **Interaction:** gender + faction + Torso variant + Legs variant dropdowns; selecting `TorsoN` or `LegsN` activates the matching client mesh and applies its faction texture. Gear visibility, auto-rotate/reset, and **⬇️ GLB export** remain supported; export keeps only the active clothing silhouettes and visible gear while baking the current skins.
- **Key RE correction (verified against client LTB):** UV compatibility does not make the numbered styles interchangeable. `Torso1` is waist-length, `Torso2` is hip-length, and `Torso3/4` are long coats. The filename's style number is the authoritative geometry key. `Torso1_1` is clothing with exposed body regions in its atlas—not a generic bare-skin option.

## 6. The GEAR paperdoll (`src/views/gear.js`)

Separate texture path, no three.js — plain PNGs per slot:
- `SLOT_TO_TEX`: Helmet/ShoulderPads/TorsoArmor("TorsoArmour")/ArmPads/LegPads
- `detectFaction(itemName)` → BOS/CMG/EC/FDC/GOM/LED/MOB/VTX (default CMG)
- `detectTier(itemName)` → tier 1–7 from keywords (basic/modified/advanced|tremor/altered/powered/tactical|spec|ops/elite|prototype; default 4)
- `getArmorTexture()` → `gear_textures/<faction>/<slot>.png` with CMG fallback — **only BOS/CMG/EC exist today** (the other 5 factions fall back to CMG art)

## 7. How it pertains to the calculator (integration map)

| Calculator surface | Model/texture hook |
|---|---|
| Item picker names | `game_data.json` recipes (`output.item`) — the source of truth |
| Weapons in MODELS tab | `weapon_names` w# → display name (manifest) |
| Armor in MODELS tab | `Piece__FACTION` naming + enriched `game_category`/`slot` |
| Gear loadout images | `gear_textures/<faction>/<slot>.png` (paperdoll) |
| Item icons in Inventory/calc | `icons/` PNGs from DTX (1,678; full 8,822 set extracted locally) |

**Known inconsistencies / gaps found:**
1. **w21 medigun label mismatch**: manifest says `w21 = "CryoTech Medigun CM2"` (regenerated after the 2322d3e fix) but the **live site serves stale `game_data.js`** with the swapped names — the Models tab and the weapon reference disagree on the live deployment (until `build-data.mjs` output is committed)
2. **No item → model deep-link**: a calculator plan result can't jump to its 3D model; the gallery is standalone (enrichment gives categories, but the calc has no "view model" affordance)
3. **Missing scripts**: `tex_upscale.py` / tex_audit (referenced in comments + git history, absent from repo); both manifest scripts hardcode another machine's repo path
4. `enrich_manifest_game.py` inventory-index bug (`.name` vs `.item`)
5. `gear_textures/` only covers BOS/CMG/EC

## 8. Answering member questions from this

| Member asks… | Answer path |
|---|---|
| "Show me the X weapon in 3D" | MODELS tab → Weapons category (weapon_names-mapped) |
| "What does faction armor look like?" | MODELS tab Armor (`Piece (FACTION)`) or `images/.../items/<FACTION>/` icons |
| "Why is this model untextured?" | No DTX skin found in client at conversion time → `textured: false` (40 models) |
| "Can I get the texture as PNG?" | Workbench → Export PNG / upscale 4× |
| "How do I rebuild the model catalog?" | Run `gen_model_manifest.py` → `enrich_manifest_game.py` (after fixing hardcoded paths) |
| "Where do gear images come from?" | `gear_textures/<faction>/<slot>.png` (faction detect → tier detect → fallback CMG) |
| "Can I see the LED clothes / dress up a character?" | MODELS tab → **🧍 Character Studio**: gender + faction + torso/legs variant dropdowns, gear toggles, GLB export (`character_skins.json` + `models/skins/` WebP) |

*Compiled 2026-08-06 from repo source + client assets. Extraction of the full DTX set (7,588 PNGs) is staged locally at `/home/hermes/workspace/game-client/extracted/` — not yet in the repo.*
