import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const app = readFileSync(join(root, 'src/app.js'), 'utf8');
const core = readFileSync(join(root, 'src/app-core.js'), 'utf8');
const css = readFileSync(join(root, 'src/styles.css'), 'utf8') + readFileSync(join(root, 'src/styles/ux-release.css'), 'utf8');

describe('calculator UX improvements', () => {
  it('explains local profile setup and faction impact before the calculator starts', () => {
    assert.match(html, /Set up a local player profile/);
    assert.match(html, /saved only in this browser/i);
    assert.match(html, /does not lock recipes/i);
    assert.match(html, /Continue to calculator/);
  });

  it('validates quantity instead of coercing invalid input into a valid plan', () => {
    assert.match(html, /id="calc-qty"[^>]*min="1"[^>]*step="1"/);
    assert.match(html, /id="calc-qty-error"[^>]*role="alert"/);
    assert.match(app, /quantity must be a whole number of at least 1/i);
    assert.match(app, /setAttribute\('aria-invalid', 'true'\)/);
    assert.match(app, /calculation-error/);
  });

  it('uses complete plain-language result and route summaries', () => {
    assert.match(app, /This production run makes[^<]*<b>.*displayName\(item\)/s);
    assert.match(app, /function renderRouteSummary\(/);
    assert.match(app, /<b>Refine<\/b> intermediates at/);
    assert.match(app, /<b>Manufacture<\/b> the final item at/);
    assert.match(app, /<b>Move<\/b> completed intermediates to/);
  });

  it('uses the shared rich stats presentation without repeating the destination header', () => {
    assert.match(app, /const statsHtml = renderPlanStats\(plan\)/);
    assert.match(core, /class="plan-top"/);
    assert.match(core, /class="cost-panel/);
    assert.match(core, /renderPerUnitPricing\(plan\)/);
    assert.match(app, /The route cards below show each material[\\'s]* exact colony movement/i);
    assert.doesNotMatch(app, /<h3>\$\{fmt\(qty\)\} × \$\{esc\(displayName\(item\)\)\} at \$\{esc\(DESTINATION\)\}<\/h3>/);
  });

  it('styles the route summary and visible metric explanations for readable scanning', () => {
    assert.match(css, /\.route-summary/);
    assert.match(css, /\.cost-panel/);
    assert.match(css, /\.calculation-error/);
  });
});
