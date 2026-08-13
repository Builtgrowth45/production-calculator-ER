# 🎓 Empire Rising Knowledge Base

*Public reference guides for Empire Rising. Data verified against `data/game_data.json`, 2026-08-06. Historical and source attribution to the Colonization & Mining Guild (CMG) is retained where relevant.*

This is a community-maintained reference for the map, production chains, and game systems — written down so every player can use the same facts.

## Guides

| Guide | What it covers |
|---|---|
| [Mining](mining.md) | All 13 mine sites, what each yields, and the resource choke points that drive route planning |
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

- **New players:** start with Mining → Production 101 → Armor 101. By the end you'll know what to mine, where, and why.
- **Experienced players:** Drugs is the quick-reference; Mining has the choke-point table that drives route planning.
- **Contributors:** cross-check everything against the calculator — costs drift with colony taxes and local session state.

## House rules

1. The source of truth is `game_data.json` + the calculator. If a doc disagrees with the app, **the app wins** — open a public issue so the source or guide can be corrected.
2. Known gaps are documented in the guides (e.g. `ultra resilient mineral` has no mine site yet — see [Armor 101](armor-101.md#known-gaps)).
3. Want a topic covered? Open a public issue or contribution request — the knowledge base grows through community questions.

## Roadmap

- [x] Mining / Production / Armor / Drugs guides
- [x] In-app Academy tab — docs auto-converted to the tab by `scripts/build-academy.mjs` → `src/academy_docs.js`
- [ ] Item spotlights (community updates)
- [ ] Gear loadout guides
- [ ] Colony-by-colony production hub notes
