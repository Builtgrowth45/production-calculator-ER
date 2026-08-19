// tests/mobile-tables.test.mjs — P3 mobile table usability contract
// ============================================================================
// The app's data tables must stay usable at narrow widths without breaking the
// desktop layout. Contract:
//   1. Every wide data table lives inside a horizontal-scroll wrapper
//      (intentional scrolling — never page-level overflow).
//   2. At mobile widths the first (key) column is pinned so the item/node
//      name stays readable while the row scrolls.
//   3. Tables keep accessible semantics: scope="col" header cells and a
//      caption naming the table for assistive tech.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const components = readFileSync(join(root, 'src', 'styles', 'components.css'), 'utf8');
const surviving = readFileSync(join(root, 'src', 'styles', 'surviving-reference.css'), 'utf8');
const reference = readFileSync(join(root, 'src', 'views', 'reference.js'), 'utf8');
const inventory = readFileSync(join(root, 'src', 'views', 'inventory.js'), 'utf8');
const core = readFileSync(join(root, 'src', 'app-core.js'), 'utf8');

describe('mobile table scroll containment', () => {
  it('wraps every wide data table in a scroll container', () => {
    // Inventory totals table already uses the shared wrapper.
    assert.match(html, /id="inv-table" class="ui-table-wrap"/);
    // The drugs table must opt into the same shared scroll contract.
    assert.match(html, /id="drug-table" class="ui-table-wrap"/);
    // Battle nodes wrapper scrolls horizontally instead of overflowing the page.
    assert.match(surviving, /\.bn-table-wrap[^}]*overflow-x:\s*auto/);
  });

  it('gives wrapped tables a minimum width so columns stay readable', () => {
    assert.match(components, /\.ui-table-wrap\s+table\s*\{\s*min-width:\s*38rem/);
  });
});

function mobileBlock() {
  const match = components.match(/@media\s*\(max-width:\s*767px\)\s*\{([\s\S]*?)\n\}\n/);
  return match ? match[1] : '';
}

describe('mobile pinned key column', () => {
  it('pins the first column of scrollable data tables on narrow screens only', () => {
    // All mobile pinned-column rules live behind a max-width media query so
    // the desktop table layout is untouched.
    const body = mobileBlock();
    assert.ok(body, 'expected a max-width: 767px media query in components.css');

    assert.match(body, /\.ui-table-wrap\s+table\s+th:first-child/);
    assert.match(body, /\.ui-table-wrap\s+table\s+td:first-child/);
    assert.match(body, /\.unit-scroll\s+table\s+th:first-child/);
    assert.match(body, /\.unit-scroll\s+table\s+td:first-child/);
    assert.match(body, /\.bn-table-wrap\s+table\s+th:first-child/);
    assert.match(body, /\.bn-table-wrap\s+table\s+td:first-child/);
    assert.match(body, /position:\s*sticky/);
    assert.match(body, /left:\s*0/);
  });

  it('keeps the pinned column visually opaque over scrolling content', () => {
    const body = mobileBlock();
    assert.match(body, /background:\s*var\(--bg\)/);
    assert.match(body, /background:\s*var\(--panel2\)/);
    assert.match(body, /background:\s*var\(--panel\)/);
  });

  it('switches scrollable tables to separate borders so sticky cells paint cleanly', () => {
    const body = mobileBlock();
    assert.match(body, /border-collapse:\s*separate/);
    assert.match(body, /border-spacing:\s*0/);
  });
});

describe('accessible table semantics', () => {
  it('marks every header cell with scope="col"', () => {
    // Drugs table (rendered from reference.js).
    assert.match(reference, /<th scope="col">Drug<\/th>/);
    assert.match(reference, /<th scope="col">Positive<\/th>/);
    assert.match(reference, /<th scope="col">Negative<\/th>/);
    assert.match(reference, /<th scope="col"[^>]*>Duration<\/th>/);
    assert.match(reference, /<th scope="col"[^>]*>Power<\/th>/);
    assert.match(reference, /<th scope="col"[^>]*>Code<\/th>/);
    // Battle nodes table.
    assert.match(reference, /<th scope="col">Node<\/th>/);
    assert.match(reference, /<th scope="col">Type<\/th>/);
    assert.match(reference, /<th scope="col">Nearest Vort<\/th>/);
    // Inventory totals table.
    assert.match(inventory, /<th scope="col">Item<\/th>/);
    assert.match(inventory, /<th scope="col">Total<\/th>/);
    assert.match(inventory, /<th scope="col">Locations<\/th>/);
    // Item-detail zone/qty table.
    assert.match(inventory, /<th scope="col">Zone<\/th>/);
    assert.match(inventory, /<th scope="col"[^>]*>Qty<\/th>/);
    // Per-unit pricing table (calculator).
    assert.match(core, /<th scope="col" class="up-item">Item<\/th>/);
    assert.match(core, /<th scope="col" class="up-num">Req<\/th>/);
    assert.match(core, /<th scope="col" class="up-num">Made<\/th>/);
    assert.match(core, /<th scope="col" class="up-num">Batches<\/th>/);
    assert.match(core, /<th scope="col" class="up-num">Cost\/unit<\/th>/);
    assert.match(core, /<th scope="col" class="up-num">Net faction cost\/unit<\/th>/);
    // Gear stat guide.
    assert.match(html, /<th scope="col">Stat<\/th>/);
    assert.match(html, /<th scope="col">Counters<\/th>/);
    assert.match(html, /<th scope="col">Faction set<\/th>/);
  });

  it('names the main data tables with a caption for assistive tech', () => {
    assert.match(reference, /<caption class="sr-only">[\s\S]*?Drug[\s\S]*?<\/caption>/);
    assert.match(inventory, /<caption class="sr-only">[\s\S]*?Inventory[\s\S]*?<\/caption>/);
    assert.match(core, /<caption class="sr-only">[\s\S]*?Per-unit pricing[\s\S]*?<\/caption>/);
  });
});
