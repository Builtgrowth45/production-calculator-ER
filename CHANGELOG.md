# Changelog

All notable changes to this project are documented here, newest first, in the
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) shape.

**Two records live in this file.** Everything from `1.3.0` down is the
*upstream* release history of `ChrisFromNEPA/production-calculator-ER`, kept
verbatim — its links point at that repository's commits, releases, and CI runs,
because that is where the evidence lives. Everything above it is *this fork's*
record (`Builtgrowth45/production-calculator-ER`) and links here.

This fork has cut no tagged release of its own yet, so all of its work sits
under `[Unreleased]`.

## [Unreleased]

Everything this fork has done since upstream `1.3.0`, whose evidence commit is
[`c754cf5`](https://github.com/Builtgrowth45/production-calculator-ER/commit/c754cf5).

### Added

- **A "My Character" tab, first in the console nav, that takes the character's
  name.** Naming, faction, body, face shape and map, hair style and map, skin
  tone, top, legs and clothing style all live there, with the 3D character
  beside them. The tab label becomes the character's name once one is set.
- **The character is saved onto the player record.** Appearance used to be
  session state that a reload threw away; it now persists as `players[].look`
  and is restored on load, so the Gear loadout and the next visit show the
  character that was made rather than a fresh roll.
- **Every face and hair map is reachable.** The console read the ten maps
  bundled under `assets/heads_sm`; it now reads `models/character_parts.json`
  over the CDN, which indexes all 4 face shapes and 13 hair styles per gender.
  Shape and map are separate pickers, and the bundled maps stay the fallback
  when the index is unreachable.
- **Character appearance is chosen, not rolled, on both character screens.**
  The ER Ops Console panel had MALE/FEMALE and faction tabs and a ⟳ RANDOMIZE
  button; every other part of the character was randomised and unreachable. It
  now has FACE, HAIR, SKIN, TOP, LEGS and STYLE pickers, and picking one part
  leaves the rest of the roll alone. Skin tone is its own choice: it used to be
  inferred from the face index, where face 21 silently meant dark skin.
- **Face, hair and skin-tone selection in the Character Studio.** The studio
  could already choose gender, faction, torso and legs; it now also picks the
  face map, the hair map and the bare-skin tone. `models/character_parts.json`
  (built by `npm run parts:manifest`, guarded by `npm run parts:check`) indexes
  the head, hair and skin textures that were already in `textures_extracted/`
  but had never been wired to anything — the manifest's `Head` group was empty.
  A control appears only for a part the loaded body actually carries, and only
  offers maps belonging to that mesh's shape, because a face or hair texture
  fits one mesh's UV layout and not another's.
- **ER Ops Console** — an exported static console (`er-ops-console/`: a single
  `index.html` plus the data, maps, models, and three.js vendor files it
  fetches at runtime), served from Vercel with no build step.
- **Gear 1.10 tab** — a goal-driven gear explorer. A build-goal picker (armor,
  stamina, health regen, bio regen, mobility) ranks the best craftable piece
  per equipment slot; every card shows current-versus-proposed stat chips with
  coloured deltas; the exact-stat profiles and affected-item lists are merged
  behind profile/change tabs with shared filters; the planner summarises a
  whole build with goal-score chips. Restricted to craftable gear via recipe
  lookup. The former Gear tab became Gear 1.9 and sits adjacent to it in every
  navigation surface.
- **Faction emblems and the Duels & Cigars leaderboard** on the console
  homepage — eight keyed faction logos (`assets/factions/<CODE>.webp`), and the
  Field Notes panel replaced by a leaderboard shell.
- **`npm test` runs through `scripts/guard-test-count.mjs`**, which enumerates
  the test files explicitly, parses the reported count, and fails when zero
  tests are discovered or the count cannot be read.
- **`npm run models:manifest` / `npm run models:check`** rebuild the 3D model
  manifest and its console copy from the GLBs on disk, and fail when either has
  drifted. `models:check` is part of `npm run check`.
- `.gitattributes` (`text=auto`, LF enforced for js/mjs/json/css/html).
- Maintainer and refinement records: `docs/maintainer-audit-2026-08-28.md`,
  `docs/calculator-refinements.md`, `docs/gear-110-refinements.md`.

### Changed

- **The ER Ops Console now loads its assets from this fork.** Its CDN base was
  pinned to `cdn.jsdelivr.net/gh/ChrisFromNEPA/production-calculator-ER@main`,
  so the deployed console served the upstream repository's models, icons, and
  textures — nothing this fork changed could ever reach it. It now points at
  `Builtgrowth45/production-calculator-ER@main`.
- **Ownership and links point at this fork.** The calculator's About panel, its
  social metadata, `package.json` (repository, bugs, homepage, author), the
  README, `CODEOWNERS`, the issue-template contact links, and the maintainer
  playbook now name Dain Solitaire (BuiltGrowth) and this repository. The
  original creator's credit is kept in `AUTHORS.md` and the README, and the MIT
  copyright notice is unchanged — a fork does not reassign it. The README's
  v1.3.0 link still points upstream, where that release actually lives.
- Offline shell cache advanced to `er-v0.2.42`.
- Vercel serves the console bundle directly (`outputDirectory:
  "er-ops-console"`, no install or build command).
- Colony map assets are re-keyed to WebP with a real alpha channel and shrink
  from 785 KB to 647 KB.
- The dead Comms tab and its lifecycle hooks are gone; no comms markup, assets,
  or loader ever shipped.

### Fixed

- **`npm test` passed without running anything on Windows.** The quoted glob
  was literal in `cmd.exe`, so the suite exited 0 having discovered zero tests.
  The count guard now makes that state a failure.
- **18 Windows-only test failures** from `new URL().pathname` being used as a
  filesystem path, replaced with `fileURLToPath`.
- **The 3D gallery manifest had drifted from the assets on disk.** Every one of
  its 602 entries recorded a size 140–144 bytes short of the real file — the
  delta `scripts/fix_model_handedness.py` adds when it rewrites a model — and
  four weapon variants (`w1_hh2`, `w3_hh2`, `w4_hh2`, `w9_hh2`) were missing
  from the gallery entirely.
- **Calculator tab.** `copyShoppingList` used the wrong `compute()` argument
  shape for single plans, so the chosen refinement path was ignored; it now
  honours scratch mode and reports empty input. The accessibility announcement
  read a selector that no longer existed, so the headline number never
  announced or flashed. Path radios now mirror their live checked state in
  `aria-checked`. Re-parsing the plan container restarted every animation on
  each run. Sticky-header scroll anchoring, reduced-motion handling, and
  several hover/focus states were corrected.
- **Gear 1.10 slot model and presentation.** Stamina Amplification and Shield
  Implant belong to the chest slot; Resistance Amp stays mutually exclusive
  with leg armour. Raw balance-sheet keys (`biodamage`, `staminadamage`) no
  longer leak into profile cards; proposed chips no longer repeat the base
  value when the delta equals it; selected gear names are shown in full; stale
  profile-gate toasts are cleared; the mobile Protection guide layout and a
  duplicated slot icon are fixed; the explorer widens on large displays.
- **Console landing page.** The preview image pointed at an unresolved design
  asset id (404) and at `min(1600px, 96vw)`, dominating wide screens.
- Player state is normalised so non-array entries become arrays and stale
  profiles are removed when a player is deleted.
- `package-lock.json` name and version match `package.json`; stale
  `scripts/__pycache__` bytecode is untracked.

### Verification

- Local only. `npm test` passes 515/515; `npm run models:check` reports the
  manifests in sync.
- **No CI evidence exists for this fork.** GitHub Actions has produced zero
  workflow runs here, so `ci.yml`, `codeql.yml`, and `pages.yml` have never
  executed on these changes despite being configured to run on every pull
  request. The upstream CI links below belong to `1.3.0` and earlier.
- `npm run check` cannot complete in every environment: `build:3d` needs
  `vite` installed.

## [1.3.0] — 2026-08-26

Verified GitHub Pages release for merge commit
[`be48ffe9`](https://github.com/ChrisFromNEPA/production-calculator-ER/commit/be48ffe9e9041b1d49fe20e3243b4b247f4f3bf2).
See the [GitHub release](https://github.com/ChrisFromNEPA/production-calculator-ER/releases/tag/v1.3.0)
and [release QA record](docs/release-qa.md) for deployment evidence.

### Added

- Public orientation panel, source link, fictional sample screenshot, and
  recruiter-friendly project documentation.
- Combined-plan scratch mode that ignores current inventory without mutating
  the live inventory state.
- Complete sanitized mining-drift observation fixtures and regression checks.

### Improved

- Single-item and combined-plan actions remain isolated to their originating
  result.
- Production and refinement destinations are independently selectable, with a
  reversible same-location convenience mode.
- Mine and Refine progress cards, narrow-screen wrapping, and calculator
  result presentation are more consistent.
- Mining drift is calibrated against six supplied 100-cycle observations;
  cooling supports Off/0 while energy remains 1–20 and active cooling remains
  1–20.
- Offline shell cache is updated to `er-v0.2.38`.

### Verification

- Local `npm run check` passed with 486/486 tests, production build, and
  baseline verification.
- [CI run 33004438092](https://github.com/ChrisFromNEPA/production-calculator-ER/actions/runs/33004438092),
  [CodeQL run 33004438027](https://github.com/ChrisFromNEPA/production-calculator-ER/actions/runs/33004438027),
  and [Pages run 33005751979](https://github.com/ChrisFromNEPA/production-calculator-ER/actions/runs/33005751979)
  passed for the merged release.
- Browser UX, 3D, performance-budget, asset-provenance, dependency-audit,
  and privacy checks passed.

## [1.2.0] — 2026-08-13

### Added

- Original client map release with 79 PNG map tiles and the published
  Real-ESRGAN x4 archive.
- Source/output dimensions, timings, and SHA-256 hashes in the release
  manifest; original alpha channels were preserved.

See the [v1.2.0 GitHub release](https://github.com/ChrisFromNEPA/production-calculator-ER/releases/tag/v1.2.0)
for the archive and its limitations.

## [1.1.0] — All-Factions Public Player Support

### Added

- Canonical public faction registry with aliases and safe `Unaffiliated` mode.
- Versioned player faction profiles and complete portable workspace snapshots.
- Explicit local colony ownership/tax snapshots with import, export, reset, and fail-closed validation.
- Faction-aware gross spend, return, and net-cost calculations with cross-faction invariant tests.
- Direct hash routes for public tabs with safe unknown-route fallback.
- Public Knowledge Base navigation and faction-neutral player/economics documentation.

### Changed

- Fresh profiles no longer inherit invented CMG holdings or faction returns.
- Academy/product copy is open to all players while preserving factual CMG attribution.
- Alternative-path optimization uses active faction context only when valid ownership/policy data exists.

### Verification

- 135 automated tests pass locally.
- Production Pages build, strict asset provenance, dependency audit, Gitleaks, and Semgrep pass locally.
- Chromium production-artifact checks verify `#academy`, `#colonies`, and unknown-route fallback.

### Known limitations

- This historical release is superseded by the later verified releases listed
  above.
- Cloudflare retirement is complete: the previously documented Worker endpoints returned HTTP 404 during post-retirement verification on 2026-08-13. No Cloudflare configuration was modified by this session.
- Full Hermes interactive browser traversal remains unavailable; Chromium fallback evidence is documented in the audit.

## [1.0.0] - 2026-08-13

### Added

- Public Empire Rising production, inventory, gear, and economy calculator.
- Static GitHub Pages deployment with repository-subpath and offline support.
- Local-first saved plans, inventories, requests, gear presets, world-state settings, analytics, and import/export.
- Approved game-derived icons, textures, models, maps, gallery assets, audio, and fonts with provenance records.
- Automated tests, asset provenance enforcement, dependency auditing, Gitleaks, Semgrep, CodeQL, and Pages deployment gates.

### Changed

- Replaced private Cloudflare-backed synchronization and analytics with browser-local workflows.
- Neutralized private guild-product branding while retaining legitimate Empire Rising faction and game data.

### Known limitations

- Data is local to each browser unless explicitly exported or shared.
- Real-time shared collaboration and remote synchronization are not part of this release.
- Game-derived assets retain their separate rights-holder status and are not relicensed as MIT software.
