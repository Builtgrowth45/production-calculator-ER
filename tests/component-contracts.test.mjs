// tests/component-contracts.test.mjs — shared UI component vocabulary
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const css = readFileSync(join(root, 'src', 'styles', 'components.css'), 'utf8');

describe('shared interface components', () => {
  it('defines panel, toolbar, table, metric, empty, loading, and error contracts', () => {
    for (const name of ['ui-panel', 'ui-toolbar', 'ui-table-wrap', 'ui-metric', 'ui-empty', 'ui-loading', 'ui-error']) {
      assert.match(css, new RegExp(`\\.${name}\\b`), `${name} contract missing`);
    }
  });

  it('applies contracts to calculator, inventory, and request surfaces', () => {
    assert.match(html, /class="calc-picker ui-panel"/);
    assert.match(html, /class="controls ui-toolbar"/);
    assert.match(html, /id="inv-table" class="ui-table-wrap"/);
  });

  it('keeps mobile tables usable and empty states non-destructive', () => {
    assert.match(css, /overflow-x:\s*auto/);
    assert.match(css, /\.ui-list-state:empty::before/);
    assert.match(css, /min-width:\s*38rem/);
  });
});
