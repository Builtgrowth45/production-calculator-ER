# 🎓 CMG Academy — Knowledge Base

*Knowledge program for the Colonization & Mining Guild. Data verified against `data/game_data.json`, 2026-08-06.*

The guild's edge is knowing the map, the chains, and the numbers. This is that knowledge, written down so nobody has to relearn it the hard way.

## Guides

| Guide | What it covers |
|---|---|
| [Mining](mining.md) | All 13 mine sites, what each yields, and the resource choke points that drive guild strategy |
| [Production 101](production-101.md) | How the economy actually works: mine → refine → manufacture, batch math, fees, colonies |
| [Armor 101](armor-101.md) | The armor production landscape: the Aramid ladder, Dilatant, the 30+ six-piece families |
| [Attributes 101](attributes-101.md) | Every stat decoded: the four character-sheet panels, the 5 damage channels, and what your gear actually does |
| [Drugs](drugs.md) | All 20 combat drugs, their stat lines, costs, and when to use them |
| [Final Battle 101](final-battle.md) | How colony takeovers worked in classic FoM: occupation goals, the Military Activity hack war, the 3 timed battles, and the royalties/economy game |
| [Game Client Catalog](client-catalog.md) | Full index of the game client (12,316 files): textures, models, audio, worlds — and what's *not* in it |
| [Models & Textures](models-and-textures.md) | Technical deep-dive: LTB→GLB pipeline, DTX skins, manifest chain, the 3D viewer & gear paperdoll |
| [Client RE Dossier](client-re.md) | Reverse-engineering findings: world-file entities, per-colony facility maps, format RE (LTB/SPR/DTF/SGT), what's server-side |
| [Classic FoM Baseline](fom-baseline.md) | What the Open-FoM emulator teaches: ~90% item-name overlap, stat differences, skill schema, 245 item descriptions |
| [Face of Mankind Knowledge Base](fom-knowledge.md) | The complete encyclopedia: real-world history (2007 DDoS/Scotland Yard saga, FotD Kickstarter), Empire Rising revival + canon eras (Fall 2430 → Great Collapse 2436 → Long Night → Persistent Dawn), all 9 factions w/ official 2012 lore, lore timeline, 9 wars, colonies, weapons, canonized players |

## How to use this

- **New members:** start with Mining → Production 101 → Armor 101. By the end you'll know what to mine, where, and why.
- **Veterans:** Drugs is the quick-reference; Mining has the choke-point table that drives route planning.
- **Officers:** cross-check everything against the live calculator — costs drift with colony taxes and session state.

## House rules

1. The source of truth is `game_data.json` + the live calculator. If a doc disagrees with the app, **the app wins** — and tell an officer so we can fix whichever is wrong.
2. Known gaps are documented in the guides (e.g. `ultra resilient mineral` has no mine site yet — see [Armor 101](armor-101.md#known-gaps)).
3. Want a topic covered? Request it in the guild Discord — the academy grows on member questions.

## Roadmap

- [x] Mining / Production / Armor / Drugs guides
- [x] In-app Academy tab — docs auto-converted to the tab by `scripts/build-academy.mjs` → `src/academy_docs.js`
- [ ] Item spotlights (recurring, Discord)
- [ ] Gear loadout guides
- [ ] Colony-by-colony production hub notes
