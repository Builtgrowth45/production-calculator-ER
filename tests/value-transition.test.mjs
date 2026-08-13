// tests/value-transition.test.mjs — targeted calculator feedback contract
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = readFileSync(join(root, 'src', 'app.js'), 'utf8');
const helper = readFileSync(join(root, 'src', 'ui', 'value-transition.js'), 'utf8');
const components = readFileSync(join(root, 'src', 'styles', 'components.css'), 'utf8');
const html = readFileSync(join(root, 'index.html'), 'utf8');

describe('calculator value transitions', () => {
  it('loads the helper before app.js and exposes an accessible live summary', () => {
    assert.ok(html.indexOf('src/ui/value-transition.js') < html.indexOf('src/app.js'));
    assert.match(html, /id="calc-live-summary"[^>]*aria-live="polite"/);
    assert.match(helper, /CMG_VALUE_TRANSITION/);
  });

  it('tracks stable value positions and animates only changed rendered nodes', () => {
    assert.match(helper, /cost-panel-total/);
    assert.match(helper, /kpi-value/);
    assert.match(helper, /old === undefined \|\| old === value/);
    assert.match(helper, /cmg-value-changed/);
    assert.match(app, /CMG_VALUE_TRANSITION\?\.markChanged\(out\)/);
  });

  it('announces single and combined plan summaries without replacing calculation semantics', () => {
    assert.match(app, /item, quantity: qty, result: out/);
    assert.match(app, /Combined production plan/);
    assert.match(helper, /aria-live|textContent/);
  });

  it('keeps reduced-motion state changes immediate', () => {
    assert.match(components, /prefers-reduced-motion/);
    assert.match(components, /cmg-value-changed/);
    assert.match(components, /animation: none/);
  });
});
