# Asset provenance and redistribution status

This repository contains two different kinds of material:

1. **Original project code and documentation**, covered by the project license where stated.
2. **Empire Rising / Face of Mankind game-derived data and media**, which is not relicensed by this repository's MIT license.

The project does not claim ownership of game-derived names, logos, sounds, models, textures, maps, or extracted client material. Redistribution of those files requires permission from the applicable rights holder. Until that permission is recorded, the corresponding asset class is **not approved for a public release**.

## Current audit snapshot

The initial migration audit found approximately **615 MB across 5,168 files**, including:

| Class | Representative paths | Approx. contents | Release status |
|---|---|---:|---|
| Extracted textures | `textures_extracted/`, `gear_textures/` | PNG/WEBP/DTX game textures | **Pending permission** |
| Models | `models/` | GLB/3D client-derived models | **Pending permission** |
| Audio | `voice_extracted/` | OGG game audio | **Pending permission** |
| Icons and galleries | `icons/`, `gallery/`, `logo/`, `skins_test/` | Faction, rank, item, and UI imagery | **Pending permission** |
| Maps | `maps/` | Game-derived map/reference imagery | **Pending permission** |
| Fonts | `fonts/` | JetBrains Mono and Orbitron webfonts | Verify upstream licenses before release |
| Third-party libraries | `src/vendor/`, npm dependencies | Chart.js, Three.js, React, Drei, and related code | Retain upstream notices/licenses |
| Original application code | `src/`, `scripts/`, `tests/` | Calculator, UI, build and test code | Project license applies where original |

Sizes are informational and must be regenerated before a release. They are not evidence of permission.

## Required record for an approved asset

Every distributed binary asset or asset class must have a record containing:

- repository path or glob
- asset class
- original source or extraction method
- copyright holder, if known
- applicable license or written permission
- transformation performed, if any
- redistribution scope and restrictions
- review date
- reviewer or evidence link

The machine-readable source of truth is [`asset-provenance.json`](../data/asset-provenance.json). A status of `pending_permission` intentionally fails the release asset gate.

## Release policy

Do not publish this tree as a public Pages release while a shipped asset class remains `pending_permission` or `unknown`. The release process must either:

- record permission and change the status to `approved`, retaining the evidence; or
- exclude that asset class from the public artifact and disable/isolate the dependent feature.

Game-derived files must never be described as MIT merely because the surrounding application code uses MIT.
