# 🕵️ Client Reverse-Engineering Dossier

*Everything learned from deep-analysis of the Empire Rising client (2026-08-04 build). Methods: binary strings, format probing, world-file parsing. Raw dumps: `/home/hermes/workspace/game-client/re/<world>.strings.txt` (26 files).*

---

## 1. The binaries: a thin shell, no game data

`fom_client.exe` (3.2 MB) + `server.dll` (752 KB) + `d3d9.dll` (Detours proxy) contain **engine + networking only**:

- **D-TYPE engine** (dtype*.dll family — `dtype.inf` = "D-TYPE MAIN INITIALIZATION FILE V4.0")
- **RakNet networking** (`BandwidthTargetClient/Server`, `ApplyNetworkSimulator`, RakNet source paths)
- Console/engine command surface (`BlastServer`, `CacheModelFile`, `model-rez:`, `ILTModel::GetNode…`)

**No item tables, recipes, prices, or faction data in the binaries.** All game content is server-authoritative — which is why the calculator's data comes from runtime console dumps (`ItemList`, `ProductionPrices`) + community sheets, per the repo's `_client_re` notes. This is now *proven*, not assumed.

## 2. World `.dat` anatomy (the real knowledge gold)

Each colony map (27 files, 27 MB–86 MB) is a binary container with:

1. **Header** — chunk table: `55 000000` (count?) then file offsets; at 0x40 readable config begins (`Ambientlight 10, 10, 10;`)
2. **World config** — `LMGridSize N; AmbientLight R G B`
3. **World models** — `TranslucentWorldModel<N>` + per-surface texture paths (`tex\<colony>\<cat>\<file>.dtx`)
4. **Entity placements** — named objects with model refs:
   - Terminals: `Models\Props\Terminals\marketing_terminal.abc`, `portal.abc`, `portal_terminal.abc`
   - Props: `models\props\bank2.abc`, `eiffel1-3.abc` (Paris!), `lamp_mining.abc`, `toilet1.abc`, animated plants (elm, oak, rosemary, quinine tree, yellowbroom, butterfly)
   - Spawns: `Models\Props\Startpoint.abc`
5. **NPC AI goals** — `Allow_HospitalReceptionist`, `Allow_Receptionist`, `Goal_Reception` (world files drive NPC behaviour states)
6. **Facility entities** with texture-variant states: `Marketing Terminal - Normal`, `- Rusty 1`, `Mining Terminal - Rusty`, `Vortex Gate - Rusty Red/Green` (colony wear/damage states)

## 3. Per-colony facility map (EXACT instances, name-linked)

Full 26-world extraction → `re/world_entities.json` (2,240+ entities/world with XYZ coords), `re/facilities.csv`, `re/mining_nodes.json`. Script: `extract_entities.py` (parses the tagged property stream: `Name`/`Pos`/`Type`).

**Key facility instance counts (corrected — earlier table was substring counts, ~2× too high):**

| Facility | Total instances | Where they are |
|---|---|---|
| Marketing Terminal | 117 | everywhere; Pegasi51 (24), Berlin (20), NY_Manhattan/Paris |
| Storage Access | 111 | the storage network — all major colonies |
| Production Terminal | 78 | Pegasi51 (11), DeMorgan (13), keplersdome (11), Paris (9) |
| Vortex Terminal | 72 | travel network (see gates) |
| Medical Service | 64 | Yukon (12), NY_Manhattan (11) |
| Mining Terminal | 48 | the 13 mine-site colonies — Tokyo/ceresdelta/keplersdome heaviest |
| Apartment Entry | 40 | housing access points |
| Security Pad | 34 | security checkpoint network |
| Vortex Gate | 29 | Paris (6), Tokyo (5), Pegasi51 (4) |
| Market Terminal | 27 | Paris (18!) — trade capital |
| Medic Terminal | 29 | Aquatica (10) |
| News Terminal | 5 | Berlin, Newhaven, NY_Manhattan, Tokyo, necarsfield |
| ChemicalRefinery | 5 | Lowertokyo, NY_Brooklyn1, MoonBase, TerraVentureI |

**New entity types discovered (beyond facilities):**
- **`Mining` dig nodes — 87 total with coordinates**: Tokyo (23), keplersdome (5), NY_Manhattan (2), DeMorgan (1), ceresdelta (1), titanstation (1) + more as `Mineral Collector` (DeMorgan ×6) — actual dig spots, XYZ saved in `re/mining_nodes.json` (e.g. Tokyo nodes at y≈208–680; Kepler's strip at y=1248)
- **`NPCPath` ×85 / `NPCGoal` ×11** — NPC patrol routes + goal states (world-driven AI)
- **`Faction Pool` ×8** (NY_Brooklyn) — faction capture mechanics?
- **`Corona` ×21**, `LG_Day` ×71, `Light*` — lighting; `WorldProperties` — world config object

**Mining terminal ↔ mine-site cross-validation holds** (13 colonies, matches `game_data.json` exactly).

## 4. Format RE notes

| Format | Finding |
|---|---|
| **LTB** (models) | Magic `0100 0900`. **No embedded texture names** (0/483 reference .dtx) — skins are assigned by external convention (item name → `Skins/<Faction>/<name>.dtx`). Explains the 40 untextured models in the manifest. |
| **SGT** (music) | DirectMusic segments: `RIFF` → `segh`/`guid`/`vers`/`LIST`; max 682 B = MIDI-style *arrangements*. Real audio = co-located WAVs in `Music/<city>/` (415 files, e.g. `BerlinAction1.wav`) — **already converted: 132 music OGGs extracted** |
| **SPR** (sprites) | Tiny 51-byte containers: version header `01 20 20 20` + a texture path (`Tex\Aurelia\CubicEnvMapUP.dtx`). Sprites are texture references, not image data |
| **DTF** (fonts) | `DENEMKO-DTFONTV1-SG1` — Denemko D-TYPE font v1, SG1 variant (31 fonts: monark/neut/opt/revalo/thr/typo, weights + italics) |
| **Maps** | `Interface/worlds/maps/` = 79 × 600×600 RGBA TGA tiles (numbered 00–33) — a zoomable world-map UI. All converted to PNG |
| **DTX** | Already documented (DXT1/3/5, 164-byte header) — 7,588 extracted |
| **clientfx.fcf** | Text config ("Siblings/Name/Image/SelectedImage" — effects UI tree) |
| **autoexec.cfg** | 84 graphics/network settings |

## 5. Model internals (LTB) & font format

**LTB named internals** (extracted from all 483 models):
- **`baseAnim` ×91** — every animated model has a base animation anchor
- **`HandHeld` ×13 / `PowerUp` ×15** — weapon grip & power-up attachment points
- **`Bip01` ×9 / `zN_Skeleton` ×6** — 3DS-Max biped skeletons
- **`SI69`/`SI6B`/`SI6C`/`SI67`/`SI6I`** (22 total) — **texture-slot IDs** (how DTX skins bind to submodels — the "Skin Index" slots)
- **`FOOTSTEP` ×6** — footstep event markers; `Idle` ×49 — idle states

**DTF fonts** — `DENEMKO-DTFONTV1-SG1`, bitmap font, ~52 glyphs, height ≈240px (large UI type). Full glyph-table parse is an open lead.

**.abc**: world files reference `*.abc` (e.g. `marketing_terminal.abc`) but **no .abc ships in the client** — engine maps the refs to shipped LTB assets.

## 6. Model coverage vs game data (the calculator gap)

| Category | With model | Total | % |
|---|---|---|---|
| Explosive / Weapons | 4 / 1 | 4 / 1 | 100% |
| Guns | 14 | 15 | 93% |
| Ammunition | 12 | 16 | 75% |
| Implants & Electronics | 6 | 9 | 66% |
| Food & Drink | 4 | 8 | 50% |
| **Armor** | **111** | **255** | **43%** |
| Medical | 3 | 7 | 42% |
| Drugs | 2 | 20 | 10% |

- **All 22 `weapon_names` have models** (27 weapon-tagged entries incl. variants) ✅
- **Armor is the gap (43%)** — many pieces share slot/tier geometry, but the manifest doesn't map them; per-piece 3D views are missing for ~140 armor recipes
- **Drugs use generic props** (`drug_inhilator/injector/pills`) — no per-drug model, consistent with client assets
- Saved: `re/model_coverage.json`

**Armor gap — root cause resolved (2026-08-06, tools archive):** the client has only **66 item models** and **no per-piece armor meshes**. Armor is *skinned onto shared body meshes* (`f_Average`/`m_Average` + faction skins) — the paperdoll approach. The manifest's 210 "Armor" entries are body meshes with skin variants. Per-piece 3D armor can't exist because the game doesn't have it — the gear paperdoll (`gear_textures/`) IS the armor visual.

## 6b. The official dev tools (TOOLS_FOM.zip, 315 MB)

**Complete LithTech pipeline** — `tools_fom/`:
- **Model tools:** `ModelEdit.exe`, `ltbhead.exe` (LTB header dumper), `ltaview.exe` (LTA viewer), `Model_Packer.exe`, `DtxView.exe`/`dtxutil.exe`/`DtxOptimizer.exe` (textures), `WaveEdit.exe` (audio), `FxED.exe` (effects), `dedit.exe`, `LithRez.exe` (resource packer), `LTC.exe`/`WinLTC.exe`/`TSCompiler.exe` (compilers), `lipcompiler.exe` (lip sync), `ButeEdit/Check`, `CRUD`, `pma`, `LTAsk`
- **Authoring plugins:** 59 MEL scripts + 12 Maya plugins (`Plugins/alias/maya7.0`) + 3DSMax `dle` plugins — the export pipeline UI (`LithTechModelExportOptions.mel`: Animation Name, Scale Modifier, Ignore Bind Pose, Export Normals, Use Maya Texture Information…)
- **Source models: 406 `.lta` files = 100% of client `.ltb` models** (1:1 stem match, incl. 49 MB `f_Anim03.lta` animations)
- **`RenderStyles/*.lta`** — the entire material/shader system in readable form (lightmaterial ambient/diffuse/specular/emissive + renderpass blendop/zbuffermode/cullmode + texturestageops colorop/alphaop/uvsource/texfilter)

**LTA format (fully decoded):** S-expressions — `(lt-model-0 (on-load-cmds (anim-bindings … lod-groups … add-node-obb …)) (shape "N" (geometry (mesh (vertex …) (tri-fs …) (normals …))) (texture-indices …) (renderstyle-index N)))`

**LTA→GLB converter written & proven:** `lta2glb.py` (pure Python, S-expr parser + vertex welding + glTF 2.0 GLB emitter). Validated: biocell.lta → GLB renders in three.js with **zero console errors**, bounds exactly matching the repo's existing GLB. Batch: **437/445 converted in 20 s** (8 fails = pure animation files). `re/lta_glbs/` holds all outputs.

## 6c. LTB binary format — cracked (native converter, no wine)

**Vertex record (static models):** 32-byte interleaved `position (3×f32) + normal (3×f32) + UV (2×f32)`. Vertices are **welded across shapes** (biocell: 369 unique = exactly the repo GLB count).

**Layout (biocell.ltb, 20,758 B):** `[header + strings ~212 B][vb: 369×32 = 11,808 B][index block: 594 u16][vb2: 203×32][piece data][tail]`. Header u16s: `1,9` magic → `23,0` → `shape_count,0` → `1,0 3,0 1,0 1,0` → `total_tris,0` → … Triangle indices are **u16, local to the primary mesh**; the repo GLB uses only the first index block (198 tris = LOD0), secondary pieces follow.

**`ltb2glb.py` — native binary converter:** content-based vb detection (plausible pos + unit normals + sane UVs — rejects index bytes that read as denormals) + first dense index block. **Validated: biocell.ltb → GLB = 369 verts / 198 tris / bounds [-4.8136, -0.7845, -4.7956]→[4.9216, 1.939, 4.9396] — IDENTICAL to the repo's GLB**, renders in three.js with zero errors.

**Batch: 292/445 client LTBs converted in 9 s** (`re/ltb_glbs/`): Props 172/202, Einrichtung 45/61, Items 57/136, ranks 5/8, Characters 9/23, Enemies 2/10.

**Remaining frontier — skinned models:** Characters/Enemies use a different vertex format (bone weights/skinning, larger stride; `m_Average.ltb` = 3.7 MB with real counts in header: 340/2/42/73/5/57470). Needs the skinned-vertex RE (bone index/weight layout) — next project.

**Wine status:** portable Wine 11.14 staging installed (`wine-11.14-staging-amd64/`); the old LithTech tools run but are silent (no stdout/files) — confirmed low value for agentic use vs the native converters.

## 7. What remains server-side (cannot be extracted)

- Ore yields per mining node, item recipes/prices, faction standing effects, market prices, `ultra resilient mineral` source (P2c) — all runtime/server data. The client confirms *where* facilities are, not *what they cost*.

## 6. Member Q&A with this dossier

| Member asks… | Answer |
|---|---|
| "Where's the mining terminal in X?" | Facility table above (or per-world dump in `re/`) |
| "Where can I refine chemicals?" | Lowertokyo / MoonBase / NY_Brooklyn / TerraVenture |
| "Where do I sell stuff / find markets?" | Paris (42 markets), NY_Brooklyn1 (21) |
| "How do I travel between colonies?" | Vortex Gates — MoonBase hub (28), Tokyo (26) |
| "Where can I recycle/repair?" | Recycle: BookersValley, NY_Brooklyn1 · Repair: Newhaven, NY_Brooklyn1 |
| "Why do some terminals look rusty?" | Facility texture-variant states (Normal/Rusty) baked into the world |
| "Can I extract item data from the client?" | No — server-side; use `game_data.json` + console dumps |

*Compiled 2026-08-06. Next leads: LTB binary model parser, DTF glyph renderer, .abc animation format, world .dat full entity extraction to JSON.*
