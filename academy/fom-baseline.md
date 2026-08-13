# 🏛️ Classic FoM Baseline — What the Open-FoM Emulator Teaches Us

*Source: [github.com/Open-FoM](https://github.com/Open-FoM) — an AI-first reverse-engineering + emulation sandbox for **Face of Mankind** (FoM), the game Empire Rising continues. FoM data = the classic baseline; Empire Rising (ER) stats differ per version. Reference data saved locally: `re/fom/` (weapons.csv, armors.csv, medications.csv, implants.csv, SkillsTable.csv, CRes item catalogs, er_item_descriptions.json). Verified 2026-08-06.*

## What the repo is

- **`fom-emulator`** (352 MB): TypeScript server emulator (native RakNet via FFI), client emulator, hook tooling, and **RE notes/mappings** — an AI-first project ("most notes are raw captures; treat as hypotheses")
- **`fom-lore`**: background story, major wars, organizations, timeline
- **`fom-ai-assistant`**, **`core`** (C++), **`lithtech-singularity`** (engine source docs)

Key RE artifacts: `Docs/ItemCatalog/CRes_*_items.csv` (3,011 items with descriptions), `Docs/Exports/` (weapons/armors/medications/implants/SkillsTable CSVs), `Docs/Notes/` (packet formats, login flow, item override formats), `Docs/AddressMaps/`.

## The big finding: Empire Rising ≈ Face of Mankind, continued

**~90% of ER's item universe carried over from classic FoM:**

| ER data | FoM overlap |
|---|---|
| weapon_names (22) | **20/22 in FoM** weapons.csv (w13/18/19/20 etc. all classic) |
| Guns recipes (15) | **15/15 in FoM** (Protonix Barracuda, Chrono Enervon EP24, Aurelian Dominator…) |
| Armor families (20 sampled) | **20/20 in FoM** (Tactical Systems, Advanced Civilian, MT-27, Locans, Pythica, NanoTech, Delta Powered, PreMet, Dilatant 46b, Aramid…) |
| Production materials | Titanium Alloy, Metal Alloy, Special Steel Alloy, Chemicals, Aluminium Alloy — all in FoM catalog |
| Mining tools | RK 2a7, RX Zephyr, U-V890 Hyper Advanced Mining Tool (in FoM weapons!) |
| **Portable Vortex Particle Emitter** | in FoM catalog (the ER item that needs `ultra resilient mineral` — P2c) |

## Stats differ (as you said)

- **FoM weapons.csv** (39 weapons): DPS model — e.g. Zanathid 5 Inflex 37.9 DPS, Techtronic 6x6 49 DPS, Chrono Enervon EP24 67.5 DPS, Salvotec HP220 70 DPS
- **ER game_data weapons** (26 ids with stats): per-hit damage model — e.g. w1 Zanathid dmg 112.3/mag 50, w16 Hallem TAR7 dmg 400/mag 60, w21 medigun CM2 dmg 150/mag 65
- Same names, **different stat models and values** — never mix the two datasets in the calculator
- ER has **11 unnamed weapon ids** (w22–w32 have stats, no names) — FoM's catalog has candidate names (Frostbite, Backer Rifle, Hawk-72, Linner PP-X, Zanathid 5.5 CopKiller, Experimental X-01, Personal/Territory Turret…) but no confirmed mapping

## The skill system (FoM SkillsTable.csv — 100+ skills)

- Groups: med (medikit tiers + "% greater effects"), armor ("Ability to use standard armor" → "Increases protection values by %1!u!%%"), and more
- XP-curve ladder values: 1800 → 14400 → 86400 → 172800 (medikit skill gates)
- ER's calculator doesn't model skills yet — this is the schema if it ever does

## Item descriptions — the enrichment asset

The FoM catalog has **flavor text for 3,011 items**. Built `re/fom/er_item_descriptions.json`: **245 of 378 ER items matched** to FoM descriptions (weapons, armor, materials, drugs). Examples:
- *DOA 187*: "Popularly known as simply 'DOA', this Techtronic weapon discharges supercharged particles which are hot enough to cauterize flesh…"
- *Special Steel Alloy*: "Higher grade steel alloy improved with Vanadium and Cobalt…"
- *CryoTech Medigun CM1*: "The medigun fires a stream of nano particles at the target which heals damaged tissue…"

These could enrich the calculator's item picker (name → tooltip description) with zero gameplay-stat risk.

## How to use this knowledge

| Want… | Use |
|---|---|
| Item flavor/lore for the picker | `re/fom/er_item_descriptions.json` (245 matched) |
| Classic FoM stat baseline | `re/fom/weapons.csv`, `armors.csv`, `medications.csv` |
| Skill/XP schema | `re/fom/SkillsTable.csv` |
| Lore (factions, wars, orgs) | `fom-lore/` repo (backgroundStory.md, organizations.md…) |
| Packet/network RE notes | `fom-emulator/Docs/Notes/` (login flow, packet formats) |
| The game's original binaries | `fom-emulator/Client/Client_FoM/` (fom_client.exe, server.dll, CRes.dll) |

## Caveats

- FoM ≠ ER stats — **descriptions and names transfer; numbers do not**
- The emulator repo is intentionally messy (AI-generated scaffolding); verify anything before trusting it
- w17/w22–w32 name mapping remains open — candidate names listed above, unconfirmed
