# 🗃️ Game Client Catalog — Complete File & Folder Analysis

*Exhaustive catalog of the Empire Rising (FOM) client, build dated 2026-08-04. LithTech-engine game (`fom_client.exe`). Source: `gameclient.zip` (1.20 GB) → `game/` (11,822 files, 3,109 MB extracted). Raw inventories: `inventory_all_files.txt` (every file + size), `inventory_dirs.json` (per-dir stats) — both in the extraction workspace.*

---

## 1. The big picture

| Area | Files | Size | Role |
|---|---|---|---|
| `Resources/` | 10,611 | 2,860 MB | All game assets |
| `ResourcesCustom/` | 1,145 | 239 MB | Custom/patched content overlay (same structure as Resources) |
| `System/` | 48 | 1.9 MB | Fonts, character tables, shader configs |
| `(root)` | 18 | 7.5 MB | Executable, DLLs, configs |

**Format census** (by extension, across everything):

| Format | Count | What it is | Readable? |
|---|---|---|---|
| `.dtx` (+`.DTX`) | 8,325 | LithTech textures (DXT1/3/5, 164-byte header) | binary → PNG via `scripts/convert_dtx.py` |
| `.tga` (+`.TGA`) | 1,004 | Truevision TGA textures (icons, HUD, galaxy map) | standard; image viewers |
| `.wav` (+`.WAV`) | 388+415 | Audio — voice, ambience, weapons, UI | standard; 22050 Hz mono 16-bit PCM |
| `.sgt` | 125 | DirectMusic segments (RIFF/DMSG) — music | binary; DMSG container |
| `.ltb` | 483 | LithTech models & shader programs | binary |
| `.pcx` | 229 | ZSoft PCX images (item/drug/material icons) | standard |
| `.spr` | 184 | LithTech sprites — reference texture paths (e.g. `Tex\Aurelia\CubicEnvMapUP.dtx`) | text refs inside |
| `.dat` | 48 | **World data** — colony maps (embedded readable config: `AmbientLight`, texture paths) | partially (strings) |
| `.dtf` | 31 | Denemko D-TYPE fonts (`DENEMKO-DTFONTV1-SG1` magic) | binary |
| `.gsl` | 8 | D-TYPE grayscale/shader tables (text) | text |
| `.ccv` | 7 | Character translation & alignment files for fonts (text) | text |
| `.fx` | 13 | Direct3D HLSL shaders (text) | text |
| `.psh` | 3 | Pixel shader sources (text) | text |
| `.tfs` / `.tfg` | 6/5 | Texture scripts / texture effect groups (rotation, pan) | binary, text refs |
| `.ini`/`.inf`/`.cfg` | ~5 | D-TYPE init, game config | text |

---

## 2. Complete directory tree (cumulative, all sizes)

```
game/                                       11,822 files   3,109 MB
├─ fom_client.exe, server.dll, d3d9.dll + dtypelay*.dll family, OpenAL32.dll,
│  dbghelp.dll, mspatcha.dll, l3codeca.acm, ltmsg.dll, wrap_oal.dll,
│  fom_public.key, autoexec.cfg, fom.log, dtype.inf   (18 files, 7.5 MB)
├─ Mails/                                    empty (0 files)
├─ System/                                    48 files     1.9 MB
│  ├─ fonts/   31 Denemko .dtf — monark, neut, opt, revalo, simple, terminal,
│  │           thr, typo (weights bd/bl/lt/rg/th + italic)
│  ├─ ccv/      7 character-translation tables
│  └─ ini/     10 .gsl/.pat/.fls shader tables
├─ Resources/                              10,611 files   2,860 MB
│  ├─ Interface/                           1,260 files     256 MB
│  │  ├─ items/    1,009 — ITEM & MATERIAL ICONS
│  │  │   ├─ (root): ammo (6mm/9mm/762 pcx), drugs (angeldust, blackbeauty,
│  │  │   │   clarity, crank, crystal, dox, duddal, ice, junk, neodope, ozone,
│  │  │   │   poppers, rush, speedball, vitamins…), food (beer, bennies, burger,
│  │  │   │   can, cup, dice, pizza, sushi), medikits (s/m/l/xl), implants
│  │  │   │   (imp_night_vision/resistance/shield/shoulder_lamp/stamina),
│  │  │   │   mining tools (miningtool, 2, 3), tokens (bronze/silver/gold/market),
│  │  │   │   boxes (blue/green/red/teal/yellow, covershield, redsphere),
│  │  │   │   WEAPONS w1–w33 (+wN_ammo), rocks 1–3, easteregg 1–4, alienegg,
│  │  │   │   spaceball, apartmentfeatured/purchase, namechange, permadeathinit
│  │  │   └─ FACTION DIRS (armor sets): BOS, CMG (65), Civilian, EC, FDC,
│  │  │       GIS, GOM, LED, MOB, VTX + production/ (64 raw-material icons:
│  │  │       aluminium, anthracite, bauxit, beryllium, bioplasma, caoutchouc,
│  │  │       carbonfiber, carbon, chemicals, chemsubst, chrome, coal, cobalt,
│  │  │       conductor, copper, …)
│  │  ├─ hud/       59 — armor slot icons (head/shoulders/arms/hands/torso/legs
│  │  │              + _hl highlight + empty), mining/producing HUD
│  │  ├─ worlds/   107 — maps/ 79 files, 193.5 MB (colony maps)
│  │  ├─ hqs/       22 — headquarters UI
│  │  ├─ elements/  38 — UI elements
│  │  └─ windows/   11 — window frames (6.6 MB)
│  ├─ Skins/                              1,576 files     342 MB
│  │  ├─ Characters/  614 — faction outfit textures: BOS, CMG, Civilian (170),
│  │  │   EC, FDC, GOM, LED, MOB, VTX + General, Head (103), NPC (47)
│  │  ├─ Items/       504 — item skins per faction (8 factions × 35) + Standard (88)
│  │  ├─ Props/       398 — Advertisement (51), Logos (15), Plants (144, 59 MB),
│  │  │   Terminals (54, 23 MB), Vehicles (28, 12.5 MB)
│  │  └─ ranks/        57 — rank insignia
│  ├─ Tex/                                4,958 files     644 MB
│  │  Per-colony world textures: NewYork (574, 45.6 MB), tokyo (438, 26.6 MB),
│  │  Berlin (306, 37.9 MB), Flats (307, 51.7 MB), Paris (252, 29.4 MB),
│  │  CeresDelta (264, 29.2 MB), Aurelia (151), KeplersDome (140),
│  │  PaxPrime (135), GDSYukon (127), ganymed (127), Eridani (127),
│  │  EspenParadise (117), NewHaven (109), Arcturus (101), AndromedaCity (62),
│  │  demorgan (109), titanstation (50), MoonBase (39), Pegasi51 (39),
│  │  Aquatica (34), CloneFac (36), BookersValley (65), necarsfield (55, 55 MB!),
│  │  RebirthWM (10, 19.5 MB), Briefing (157, 29 MB), CharCreation (75, 12.6 MB)
│  │  + Skies (296, 127.8 MB!), Shared (239, 22.6 MB), Shaders, Sol,
│  │  advertisement (24), logos (9), metals, natural, floor/walls/misc
│  ├─ Models/                               566 files      85 MB
│  │  ├─ Characters/  24 — civ_male01–05, civ_female01/02/04, f_Anim01–04,
│  │  │   m_Anim01–04, f_Average/m_Average (base meshes), alinea, cigarette,
│  │  │   hamburger, mobile, squirrel
│  │  ├─ Enemies/     40 — alienegg (+static/nmp/stoned), big1/big2 (+1_1..3
│  │  │   texture variants + normal maps), hunter, minuscule, rat, runner,
│  │  │   small1, small2  (matches Sounds/Characters: Human, Hunter, Miniscule, Runner)
│  │  ├─ Items/      137 — bagpack1/2, beer, biocell, burger, can, covershield,
│  │  │   cup, drug_inhilator/injector/pills, duddal, easteregg, energycell,
│  │  │   hackingdevice, hats 1–8, injector, mag_6mm/762mm/9mm, medikit…
│  │  ├─ Props/      207 — Advertisement, Logos, Plants (90, 5.9 MB), Terminals
│  │  │   (24: apartment_entry, chemlab, colony_control, marketing_terminal,
│  │  │   medic, mining, miningterminal, missioncheckin, multicom, news,
│  │  │   nf_terminal1…), Vehicles (7)
│  │  ├─ Einrichtung/ 144 — furniture (JAPAN 32, dirty 14…)
│  │  └─ ranks/         8
│  ├─ Music/                               257 files     101.5 MB
│  │  DirectMusic .sgt per area: Berlin (33), NewYork (33), Paris (32), Tokyo (34),
│  │  Colonies (35) + Colonies2 (32) + Colonies3 (32), Clubsound (10, 26.7 MB),
│  │  Login (7 MB), Menu, General, CharCreation, Tutorial
│  ├─ Sounds/                               804 files     110 MB
│  │  ├─ Speech/       315 — dialogue lines
│  │  ├─ Ambients/      84 — 55.4 MB (city ambience)
│  │  ├─ Characters/   118 — Human (51), Hunter (21), Miniscule (16), Runner (23)
│  │  ├─ Weapons/      114 — Human (93), Shells (12), Turrets (9)
│  │  ├─ FootSteps/     47 — Human (45), Hunter (2)
│  │  ├─ Voice/         32 — Welcoming (22: CMG, AndromedaCity, Aurelia, Berlin*,
│  │  │   CeresDelta, DeMorgansCastle, KeplersDome, Pegasi51, TitanStation,
│  │  │   AmericanEnterprises, Aquatica, Arcturus, AsianCoalition, BookersValley,
│  │  │   Constantinople, DominionExodus, EpsilonEridani, EspenParadise, Eurocore,
│  │  │   Moonbase, NewHaven, SolsOutpost, TerraVenture) + Interface (10)
│  │  ├─ Advertisement/ 44, Objects/ 14, Interface/ 30, Vehicles/ 5
│  ├─ Worlds/                               50 files    1,290 MB
│  │  ├─ 27 colony .dat maps: Tokyo (85.7 MB), Paris (76), ceresdelta (64.3),
│  │  │   Berlin (63.8), NY_Manhattan (56.1), Aurelia (49.3), Lowertokyo (48.9),
│  │  │   Yukon (47.1), keplersdome (46.9), necarsfield (45.4), Arcturus (44.3),
│  │  │   Aquatica (41.7), AndromedaCity, Pegasi51, PaxPrime, MoonBase,
│  │  │   Newhaven, BookersValley, DeMorgan, CloneFac, TerraVentureI,
│  │  │   NY_Brooklyn(+1), NY_GroundZero, TrainingCenter + DirTypeModels/
│  │  └─ apartments/  23 — city_1..3, city_paris_1..3, colony_1..3,
│  │      colony_aqua_1..2, ci_prison_duel… (120.8 MB)
│  │  Internal structure (strings): `LMGridSize 12; AmbientLight 10 10 10`,
│  │  `TranslucentWorldModel<N>`, then `tex\<colony>\<cat>\<file>.dtx` refs —
│  │  world models + per-surface textures, all addressable
│  ├─ SpriteTextures/                       848 files      23 MB
│  │  └─ SFX/ 844 — Weapons (616, 16.9 MB — weapon VFX), Vortex (91),
│  │      Flares (18), Implants (22), Coronas, Smoke, Rain, BulletHoles, Aliens, Weather
│  ├─ Sprites/                              221 files     0.8 MB
│  │  Per-city + SFX sprites (briefing, char creation, ripple, glow…)
│  ├─ Shaders/                               13 files     0.1 MB  (HLSL .fx: Global, Models,
│  │   PolyGrid, Shared, Sprite, World)
│  ├─ PS/ 3 .psh pixel shaders · RS/ 37 render-state tables · ClientFX/ 2
│  ├─ TextureScripts/ 6 .tfs · TextureEffectGroups/ 5 .tfg
└─ ResourcesCustom/                        1,145 files     239 MB
   ├─ Skins/   1,121 — mirror of Resources/Skins (Characters 614, Items 504,
   │            Props/Terminals 3 — the CUSTOM-patched textures override the base)
   ├─ Interface/    2 — 13.4 MB
   └─ tex/        22 — aquatica Day/Night (8.4 MB), charcreation, newyork sky,
       terraventure
```

---

## 3. Cross-references (client ↔ app data)

| App data | Client assets |
|---|---|
| `weapon_names` w1–w33 | `Interface/items/w1…w33` + `wN_ammo` icons (w21/w29 = the two CryoTech mediguns — the stale-`game_data.js` swap affects what label these show) |
| 20 combat drugs | `Interface/items/` drug icons: angeldust, blackbeauty, clarity, crank, crystal, dox, duddal, ice, neodope, ozone, poppers, rush, speedball, vitamins + `Models/Items/drug_inhilator, drug_injector, drug_pills` |
| 29 app colonies | `Worlds/*.dat` (27) + `apartments/*` + `Tex/<colony>/` + `Music/<city>/` + welcome audio in `Sounds/Voice/Welcoming/` |
| 13 mine sites | `Interface/items/production/` raw-material icons (bauxit, titanium, chemsubst…) |
| Armor slots | `Interface/hud/armor_*` (head/shoulders/arms/hands/torso/legs + highlighted/empty) |
| Factions (BOS, CMG, EC, FDC, GOM, LED, MOB, VTX) | `Interface/items/<faction>/` + `Skins/Characters/<faction>/` — every faction has 31-character/35-item skin slots; CMG has 65 item icons |
| Gear loadouts | `Models/Props/Terminals/*` (chemlab, mining, medic, colony_control, marketing…) |
| `_client_re` notes | `d3d9.dll` (Detours proxy), `server.dll`, `dtype*.dll` (D-TYPE engine libs), `fom_public.key` |

---

## 4. Extraction status & tooling

| Asset | In client | Extracted in repo | Tool |
|---|---|---|---|
| Textures (DTX) | 8,325 | 1,678 PNGs (`icons/`) | `scripts/convert_dtx.py` ✅ verified |
| TGA/PCX icons | ~1,233 | some (HUD, item icons) | any image tool |
| Voice (WAV) | 388+415 | 32 OGGs (`voice_extracted/`) | ffmpeg |
| Music (SGT/DMSG) | 125 | 0 | DMSG research needed |
| Models (LTB) | 483 | partial GLB (`models/`) | `scripts/gen_model_manifest.py` |
| Worlds (.dat) | 50 | partial (`maps/`) | strings/parse — embedded config readable |
| Fonts (DTF) | 31 | 0 | D-TYPE format |
| Shaders | 13 fx + 3 psh | n/a (text already) | — |

**Note:** item *tables* (prices, recipes) are runtime console dumps (`ItemList`, `ProductionPrices`) — NOT in the client. Curated data lives in `data/game_data.json`.

---

## 5. Member Q&A mapping

| Member asks… | Point them to |
|---|---|
| "What does this item/weapon/drug look like?" | `icons/` + client `Interface/items/` (w1–w33, drug icons, medikits, mining tools) |
| "What does the CMG faction armor look like?" | `Interface/items/CMG/` (65 icons) + `Skins/Characters/CMG/` |
| "Where is X mined?" | `academy/mining.md` + calculator OBTAIN (production icons show raw materials) |
| "What factions exist?" | The 8 faction icon dirs (BOS, CMG, EC, FDC, GOM, LED, MOB, VTX) + Civilian |
| "What does colony X sound like?" | `voice_extracted/` (22 welcome lines) |
| "What enemies are in the game?" | `Models/Enemies/` — 10 base types (alienegg, big1/2, hunter, minuscule, rat, runner, small1/2) |
| "How do I read the client?" | This catalog + `_client_re` in `game_data.json` |
| "What music plays where?" | `Music/` — 13 areas (Berlin/NewYork/Paris/Tokyo/Colonies×3/Clubsound/Login…) |
| "What's the weapon model?" | `Models/Items/` mags, energycell + `SpriteTextures/SFX/Weapons/` (616 VFX) |

*Catalog generated 2026-08-06 from the 2026-08-04 client build. Raw file listing: `inventory_all_files.txt` (11,822 entries).*
