// tests/gear-organization-effects.test.mjs — Gear layout and net-effect clarity
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const gear = readFileSync(join(root, 'src/views/gear.js'), 'utf8');
const css = readFileSync(join(root, 'src/styles.css'), 'utf8');

describe('Gear organization and effect clarity', () => {
  it('places recipe cost and the shared gear library in a row below loadout and stats', () => {
    const top = html.indexOf('class="gear-layout"');
    const stats = html.indexOf('id="gear-stats"');
    const secondary = html.indexOf('class="gear-secondary-row"');
    const cost = html.indexOf('id="gear-cost"');
    const library = html.indexOf('id="gear-sets-list"');

    assert.ok(top >= 0 && stats > top && secondary > stats);
    assert.ok(cost > secondary && library > secondary);
    assert.match(html, /class="gear-secondary-row"[\s\S]*id="gear-cost"[\s\S]*id="gear-sets-list"/);
    assert.match(css, /\.gear-secondary-row\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/s);
  });

  it('uses an all-faction name for shared gear sets', () => {
    assert.match(gear, /All-Faction Gear Library/);
    assert.doesNotMatch(gear, /Guild Gear Library/);
  });

  it('explains recovery and upkeep as a net regen-minus-drain result', () => {
    assert.match(gear, /gear-effect-summary/);
    assert.match(gear, /Net\s*=\s*Regen\s*−\s*Drain/);
    assert.match(gear, /bioenergydrain/);
    assert.match(gear, /net/);
    assert.match(css, /\.gear-effect-row\s*\{/);
  });
});
