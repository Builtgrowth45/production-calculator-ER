# Empire Rising Production Calculator

Offline-first production, inventory, gear, and economy planning for Empire Rising players.

> **Independent community project.** Not affiliated with or endorsed by the Empire Rising development team.

Created by **John Snow** with members of the **Colonization & Mining Guild (CMG)** and community contributors.

## Status

This repository is the clean public migration of the earlier private CMG calculator. The application is deployed to GitHub Pages and preserves the calculator's useful workflows through local browser storage and explicit import/export.

## Development

Requirements:

- Node.js 22 LTS or newer
- npm 10 or newer

```bash
npm ci
npm run check
npm run test:3d
npm run test:budgets
npm run assets:check
```

`npm run assets:check` verifies that every shipped binary has a recorded provenance and project-owner redistribution approval. Use `assets:report` to inspect the inventory.

The Pages artifact is built with `npm run build:pages` into `dist/`. The GitHub Actions workflows build from a clean checkout and deploy only that artifact.

Canonical data and generated runtime files must remain synchronized; edit source data and generation scripts rather than hand-editing generated files.

## Public privacy model

The public application will not use Cloudflare Workers, GitHub tokens, remote analytics, or a shared guild database. Inventories, saved plans, requests, gear presets, and world-state settings will remain in the browser unless the user explicitly exports or shares them.

## Data and methodology

Human-readable source tables, provenance, calculation formulas, known limitations, and contribution guidance will live under `data/` and `docs/` as the migration proceeds.

## License and asset notice

Original calculator code is released under the MIT License. Empire Rising game data, names, and extracted assets remain subject to separate rights and are not automatically covered by the software license. See `DISCLAIMER.md` and `docs/asset-provenance.md` before redistributing any asset class.

## Live deployment

The public site is available at <https://chrisfromnepa.github.io/production-calculator-ER/>. It is a static GitHub Pages deployment; the application does not require Cloudflare, authentication, a GitHub token, or a shared backend.

Live release verification is recorded in [`docs/release-qa.md`](docs/release-qa.md).
