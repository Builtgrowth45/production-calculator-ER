# Empire Rising Production Calculator

A free, offline-capable production planner for **Empire Rising**. Use it to turn a target item into a practical production plan: what materials to obtain, which intermediate steps to run, what the estimated investment is, and how local faction and colony assumptions affect the economics.

[**Open the live calculator**](https://chrisfromnepa.github.io/production-calculator-ER/)

> **Independent community project.** This project is not affiliated with or endorsed by the Empire Rising development team.

Created by **John Snow** with members of the **Colonization & Mining Guild (CMG)** and community contributors.

## What the calculator does

- Builds single-item and multi-item production plans.
- Expands recipes into raw materials and intermediate production steps.
- Accounts for the inventory already attached to the active player profile.
- Compares available refinement paths when price data is available.
- Separates estimated player investment from faction return and net faction cost.
- Stores profiles, inventory, plans, preferences, and colony assumptions in the browser.
- Exports and imports portable workspace backups.
- Remains usable offline after the application has been loaded successfully.
- Includes reference tools for drugs, battle nodes, colonies, models, the item catalog, character assets, and community notes.

No account, password, API key, shared guild database, or installation is required to use the public site.

## Start here: your first production plan

1. Open the [live calculator](https://chrisfromnepa.github.io/production-calculator-ER/).
2. Enter your character name and choose a faction, or leave the profile **Unaffiliated**.
3. Select **Create player and start**.
4. Search for the item you want to produce.
5. Set the quantity, destination colony, and any relevant production options.
6. Select **Calculate**.
7. Read **Plan at a glance** first:
   - material units to obtain;
   - number of production steps;
   - estimated investment;
   - the recommended order of work.
8. Open **Detailed costs, batches, and per-unit pricing** when you need the expert-level breakdown.

Your faction selection provides economic context; it does **not** hide or unlock recipes. A new profile never receives invented inventory, colony ownership, or rebates.

## Understanding the result

The result distinguishes several figures that answer different questions:

- **Estimated investment** — the gross amount the player is expected to spend under the selected prices, production path, destination, taxes, transport, and inventory assumptions.
- **Cost per unit** — the plan's investment allocated across the requested output quantity.
- **Faction return** — a modeled return that applies only when the selected faction explicitly owns the relevant colony in your local world-state settings and has a valid policy.
- **Net faction cost / cost to guild** — gross investment after the applicable faction return. This is a faction planning metric, not automatically a personal discount.

Unknown or invalid ownership and policy information fails safely to **no return**. Use **Unaffiliated** when you want a straightforward gross-cost plan without faction assumptions.

For the complete rules, see [Factions and economics](docs/factions-and-economics.md).

## Main areas

| Area | Purpose |
| --- | --- |
| **Calculator** | Choose targets, configure quantity and destination, and build production plans. |
| **Inventory** | Record materials and finished items already owned by the active player. |
| **Gear** | Assemble an armor/booster loadout, review its stats, and send required pieces to the calculator. |
| **Colonies** | Maintain local colony ownership and tax assumptions; export or import a reproducible world snapshot. |
| **Drugs** | Browse drug reference data. |
| **Battle Nodes** | Review battle-node and map reference data. |
| **Models** | Open the 3D model gallery, Character Studio, and Item Catalog from one tab. Optional model files load only when requested. |
| **Community Notes** | Read public community reference notes included with the project. |

The compact navigation may place less frequently used areas under **More**, especially on phones. **Character Studio** and **Item Catalog** are subtabs inside **Models**, not separate top-level routes.

## Profiles, inventory, and workspace backups

Data belongs to the current browser profile unless you export it.

- A **player profile** keeps its own faction and inventory.
- Changing a player's faction does not alter that player's inventory.
- **Export player** creates a player-focused backup.
- **Export workspace** creates the broadest supported local backup, including profiles, inventory, plans, preferences, and colony-world context.
- **Import workspace** validates a supported snapshot before replacing local state.
- Legacy inventory-only JSON imports remain supported.

Use **Player tools** for player and workspace import/export actions. Keep a recent workspace export if the data matters to you, especially before clearing browser data, changing browsers, or moving to another device.

Workspace files may contain character names, inventory, notes, and economic assumptions. Review and sanitize an export before posting it publicly or attaching it to an issue.

## Themes and accessibility

Open **Settings** to choose a theme, sound behavior, and text size.

General themes:

- Auto / system
- Dark
- Light
- Trans Pride
- Rainbow Pride

Optional faction palettes:

- Law Enforcement Department
- Freedom Defense Corps.
- Guardians of Mankind
- Brotherhood of Shadows
- Mercenaries of the Blood
- Colonization and Mining Guild
- EuroCore
- Vortex, Inc.

Faction palettes are visual presets only. They do not change the active player faction, recipes, ownership, prices, or calculations.

Rainbow Pride uses a restrained dark base with rainbow identity accents rather than rainbow-filled cards and controls. Motion is reduced when the browser or operating system requests reduced motion. Keyboard focus, semantic regions, and readable text contrast are treated as release requirements; accessibility issue reports are welcome.

## Sound behavior

Sound is **Off by default** and remains user-controlled. Settings offers:

- **Off** — no routine navigation audio.
- **UI cues only** — short interface cues for tab changes.
- **Terminal voices** — contextual terminal voice clips for supported areas.

A browser may require a click or key press before it permits audio. Selecting a sound mode does not bypass browser autoplay restrictions. Sound and theme preferences are saved locally.

## Offline use and updates

The calculator is a static Progressive Web App hosted on GitHub Pages. After a successful online load, its service worker caches the application shell for offline fallback. No live server is required for calculations.

Important boundaries:

- Offline availability depends on the browser having cached the necessary assets.
- Large optional 3D model files are loaded on demand rather than all being precached.
- Market prices, colony ownership, taxes, transport assumptions, and faction context are not live feeds.
- Local data does not synchronize automatically between browsers or devices.

If the site appears stuck on an old release:

1. Reconnect to the network.
2. Reload the page.
3. If necessary, perform a hard refresh or close and reopen the tab so the new service worker can activate.
4. Your stored workspace should remain local, but keeping an export is still recommended.

See [Known limitations](docs/known-limitations.md) for the complete boundary list.

## Privacy and network behavior

The public application has no login, shared guild database, remote analytics endpoint, Cloudflare Worker dependency, or GitHub-token requirement.

Profiles, inventory, saved plans, preferences, and world-state settings remain in browser storage unless you explicitly export or share them. The browser still requests public application assets—and optional model files when selected—from the public deployment, so “local-first” does not mean “no network requests during initial loading.”

Never put passwords, tokens, private URLs, connection strings, or private player information in an issue or committed workspace fixture.

## Data quality and limitations

The project contains community-maintained game data and assumptions. Values can become incomplete or outdated as Empire Rising changes.

When reporting a data problem, include:

- the item, recipe, colony, or faction involved;
- the value shown by the calculator;
- the value you expected;
- a public source or sanitized in-game evidence;
- the date the value was checked;
- a minimal reproduction when calculation behavior is involved.

Canonical source data and generated runtime files must remain synchronized. Contributors should edit source data and generation scripts rather than hand-editing generated JavaScript.

Useful references:

- [Public player guide](docs/public-player-guide.md)
- [Factions and economics](docs/factions-and-economics.md)
- [Known limitations](docs/known-limitations.md)
- [Asset provenance](docs/asset-provenance.md)
- [Release QA](docs/release-qa.md)
- [Contributing](CONTRIBUTING.md)

## Local development

### Requirements

- Node.js 22 LTS or newer
- npm 10 or newer

### Install and run

```bash
git clone https://github.com/ChrisFromNEPA/production-calculator-ER.git
cd production-calculator-ER
npm ci
python3 -m http.server 8765
```

Open <http://localhost:8765/> in a browser. Serving the repository over HTTP is preferable to opening `index.html` directly because service workers, modules, and asset paths follow browser origin rules.

### Test and build

Run the normal release gate:

```bash
npm run check
```

That command runs the complete Node test suite and creates the production Pages artifact in `dist/`.

Additional focused gates:

```bash
npm run test:3d       # build and verify the optional React Three Fiber bundle
npm run test:budgets  # verify 3D size and performance contracts
npm run assets:check  # enforce recorded provenance for shipped binary assets
npm run assets:report # inspect the asset inventory without enforcing the gate
```

The main scripts are:

| Command | Result |
| --- | --- |
| `npm test` | Runs all `tests/*.test.mjs` contracts. |
| `npm run build:3d` | Builds the lazy optional 3D workbench. |
| `npm run build:pages` | Builds 3D assets and stages the GitHub Pages artifact in `dist/`. |
| `npm run build` | Alias for the Pages build. |
| `npm run check` | Runs tests and the complete production build. |

## Project structure

| Path | Purpose |
| --- | --- |
| `index.html` | Static application shell and public view markup. |
| `src/app-core.js` | Shared navigation, themes, audio, plan rendering, and application helpers. |
| `src/app-init.js` | Startup and DOM event wiring. |
| `src/views/` | Player, inventory, colonies, models, and other public view modules. |
| `src/styles.css` and `src/styles/` | Theme, shell, component, responsive, and view styling. |
| `data/` | Canonical human-reviewable game and faction data. |
| `scripts/` | Data generation, asset validation, and Pages build tooling. |
| `tests/` | Node-based calculation, data, accessibility, navigation, storage, and deployment contracts. |
| `docs/` | Player guidance, methodology, provenance, audits, and release QA. |
| `sw.js` | Offline shell and runtime caching behavior. |
| `dist/` | Generated Pages artifact; do not use it as the source of truth. |

## Contributing

Focused bug fixes, data corrections, documentation improvements, accessibility fixes, and reproducible browser reports are welcome.

Before opening a pull request:

1. Read [CONTRIBUTING.md](CONTRIBUTING.md).
2. Keep the change focused.
3. Include provenance and a verification date for data corrections.
4. Run `npm run check` and any relevant focused gates.
5. Include screenshots or browser verification notes for visible UI changes.
6. Never commit credentials, private inventories, Discord exports, or personal information.

Issues: <https://github.com/ChrisFromNEPA/production-calculator-ER/issues>

## Deployment

GitHub Actions builds the public artifact from a clean checkout and deploys only the staged `dist/` output to GitHub Pages. The production site tracks `main`:

<https://chrisfromnepa.github.io/production-calculator-ER/>

A release is not considered verified merely because a push succeeded. The exact commit must pass CI and CodeQL, complete the Pages deployment, and be checked on the live site. Deployment evidence is maintained in [docs/release-qa.md](docs/release-qa.md).

## License and asset notice

Original calculator code is released under the [MIT License](LICENSE).

Empire Rising names, game data, and extracted assets remain subject to separate rights and are **not** automatically covered by the software license. Project-owner approval to include an asset does not relicense that asset. Read [DISCLAIMER.md](DISCLAIMER.md) and [docs/asset-provenance.md](docs/asset-provenance.md) before redistributing game-derived content.
