// tests/trust-lane-regressions.test.mjs
// Regression tests for the three verifier-confirmed trust-lane defects
// (verifier t_61948ee6 -> fix task t_fdcda7a0):
//   1. footer #stats manifest target must exist (player.js writes to it)
//   2. footer status chips must honor [hidden] (CSS specificity)
//   3. Drugs count line must not claim "live effects" (snapshot, not live)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
const player = readFileSync(join(root, 'src/views/player.js'), 'utf8');
const reference = readFileSync(join(root, 'src/views/reference.js'), 'utf8');

describe('trust-lane regressions', () => {
  it('keeps the #stats footer manifest target that player.js writes to', () => {
    // Defect 1 (blocking): the trust lane removed <span id="stats"> but
    // player.js:68 still writes the footer feature manifest into it. Without
    // the target, refreshAll() throws on every load and aborts all later init.
    assert.match(html, /<footer>[\s\S]*?id="stats"[\s\S]*?<\/footer>/);
    assert.match(player, /getElementById\('stats'\)\.innerHTML/);
  });

  it('keeps the freshness/offline/update chips alongside the restored #stats', () => {
    assert.match(html, /<footer>[\s\S]*?id="trust-data"[\s\S]*?<\/footer>/);
    assert.match(html, /id="trust-online"[\s\S]*?hidden/);
    assert.match(html, /id="trust-update"[\s\S]*?hidden/);
  });

  it('hides footer status chips while [hidden] is set', () => {
    // Defect 2 (blocking): .footer-chip { display:inline-flex } outranks the
    // UA [hidden] rule, so the offline/update chips render on first load.
    assert.match(css, /\.footer-chip\[hidden\]\s*\{[^}]*display:\s*none/);
  });

  it('does not claim live effects in the Drugs count line', () => {
    // Defect 3: reference.js:105 still rendered "drugs · live effects" while
    // the data is a fetched snapshot.
    assert.doesNotMatch(reference, /drugs · live effects/);
    assert.doesNotMatch(reference, /· live effects/);
  });
});
