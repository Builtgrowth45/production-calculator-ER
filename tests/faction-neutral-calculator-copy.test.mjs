import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const app = readFileSync(join(root, 'src', 'app.js'), 'utf8');
const core = readFileSync(join(root, 'src', 'app-core.js'), 'utf8');
const ux = readFileSync(join(root, 'src', 'styles', 'ux-release.css'), 'utf8');
const multi = app.slice(app.indexOf('function runMultiPlan('), app.indexOf('// ── Saved production plans'));

describe('all-faction calculator language and guidance', () => {
  it('uses net faction cost instead of guild-specific cost wording', () => {
    assert.match(core, /Net faction cost \/ unit/);
    assert.match(core, /Net faction cost per unit/);
    assert.doesNotMatch(core, /Cost to guild \/ unit|Cost to guild\/unit|Cost to guild per unit|cost to faction \/ guild/);
  });

  it('encourages refining and producing at colonies owned by the active faction', () => {
    assert.match(app, /faction-owned/);
    assert.match(app, /Refine and produce at colonies owned by/);
    assert.match(app, /isOwnColony/);
    assert.match(ux, /\.route-summary-faction/);
    assert.match(multi, /html \+= renderRouteSummary\(plan\)/);
  });

  it('gives grouped cargo-transfer checkboxes an explicit accessible name', () => {
    assert.match(app, /class="transfer-cb"[\s\S]*?aria-label="Move all cargo from/);
  });
});