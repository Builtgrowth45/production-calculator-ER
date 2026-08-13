# Empire Rising Production Calculator

Offline-first production, inventory, gear, and economy planning for Empire Rising players.

> **Independent community project.** Not affiliated with or endorsed by the Empire Rising development team.

Created by **John Snow** with members of the **Colonization & Mining Guild (CMG)** and community contributors.

## Status

This repository is the clean public migration of the earlier private CMG calculator. The application is being adapted for static GitHub Pages hosting while preserving the calculator's useful workflows through local browser storage and explicit import/export.

## Development

Requirements:

- Node.js 22 LTS or newer
- npm 10 or newer

```bash
npm ci
npm run check
npm run test:3d
npm run test:budgets
npm run assets:report
```

`npm run assets:check` is intentionally fail-closed while game-derived binaries lack redistribution approval. It must pass before a public release; use `assets:report` during development to inspect the outstanding review list.

The Pages artifact is built with `npm run build:pages` into `dist/`. The GitHub Actions workflows build from a clean checkout and deploy only that artifact.

Canonical data and generated runtime files must remain synchronized; edit source data and generation scripts rather than hand-editing generated files.

## Public privacy model

The public application will not use Cloudflare Workers, GitHub tokens, remote analytics, or a shared guild database. Inventories, saved plans, requests, gear presets, and world-state settings will remain in the browser unless the user explicitly exports or shares them.

## Data and methodology

Human-readable source tables, provenance, calculation formulas, known limitations, and contribution guidance will live under `data/` and `docs/` as the migration proceeds.

## License and asset notice

Original calculator code is intended to be released under the MIT License. Empire Rising game data, names, and extracted assets may be subject to separate rights and are not automatically covered by the software license. See `DISCLAIMER.md` and the forthcoming provenance documentation before redistributing any asset class.
