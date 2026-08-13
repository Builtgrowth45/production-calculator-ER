// tests/calculator-layout.test.mjs — calculator workbench contract
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const views = readFileSync(join(root, 'src', 'styles', 'views.css'), 'utf8');

function count(id) { return (html.match(new RegExp(`id="${id}"`, 'g')) || []).length; }

describe('calculator workbench layout', () => {
  it('provides semantic browser, setup, outcome, and plan regions', () => {
    assert.match(html, /class="calc-workbench"/);
    assert.match(html, /class="calc-browser"[^>]*aria-label="Item browser"/);
    assert.match(html, /class="calc-setup"/);
    assert.match(html, /class="calc-outcome ui-panel"[^>]*aria-label="Calculation outcome"/);
    assert.match(html, /class="calc-plan"/);
  });

  it('preserves calculator handler IDs exactly once', () => {
    for (const id of ['picker-cat', 'picker-search', 'picker-grid', 'calc-item', 'calc-qty', 'calc-dest', 'calc-run', 'calc-add', 'calc-save', 'calc-tax', 'calc-tray', 'calc-result', 'calc-multi']) {
      assert.equal(count(id), 1, `${id} should remain unique`);
    }
  });

  it('keeps the new layout opt-in and provides desktop/tablet/mobile order', () => {
    assert.match(views, /data-cmg-layout-v2="on"/);
    assert.match(views, /grid-template-columns:[^;]*var\(--view-browser-width\)/);
    assert.match(views, /@media \(max-width: 1179px\)/);
    assert.match(views, /@media \(max-width: 767px\)/);
    assert.match(views, /\.calc-browser \{ order: 4; \}/);
  });
});
