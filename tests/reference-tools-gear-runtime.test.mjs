import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const read = p => readFileSync(join(root, p), 'utf8');
const html = read('index.html');
const reference = read('src/views/reference.js');
const gear = read('src/views/gear.js');
const init = read('src/app-init.js');
const css = [
  read('src/styles.css'),
  read('src/styles/ux-release.css'),
  read('src/styles/surviving-reference.css'),
].join('\n');

describe('Battle Nodes usable map workspace', () => {
  it('constrains the inline map and provides an explicit open-map control', () => {
    assert.match(reference, /class="bn-map-img"/);
    assert.match(reference, /class="bn-map-open"/);
    assert.match(css, /\.bn-map-img\s*\{[^}]*max-height:/s);
    assert.match(css, /\.bn-map\s*\{[^}]*min-width:\s*0/s);
  });

  it('keeps the lightbox fixed to the viewport with bounded media and controls', () => {
    assert.match(css, /\.bn-lightbox\s*\{[^}]*position:\s*fixed[^}]*inset:\s*0/s);
    assert.match(css, /\.bn-lightbox-viewport\s*\{[^}]*overflow:\s*hidden/s);
    assert.match(css, /\.bn-lightbox-img\s*\{[^}]*max-width:\s*100%[^}]*max-height:\s*100%/s);
    assert.match(reference, /setAttribute\('aria-modal',\s*'true'\)/);
  });

  it('supports colony keyboard navigation and a mobile single-column layout', () => {
    assert.match(reference, /ArrowRight|ArrowLeft/);
    assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*\.bn-controls-head,\s*\.bn-layout,\s*\.gear-balance-controls\s*\{[^}]*grid-template-columns:\s*1fr/s);
  });
});

describe('Player Tools overlay containment', () => {
  it('uses a top-layer popover contract that cannot escape the viewport', () => {
    assert.match(css, /\.player-actions-menu\s*\{[^}]*z-index:/s);
    assert.match(css, /\.player-actions-menu\s*\{[^}]*max-width:\s*calc\(100vw/s);
    assert.match(css, /\.playerbar\s*\{[^}]*overflow:\s*visible/s);
    assert.match(init, /player-actions[\s\S]*toggle|player-actions[\s\S]*closest/s);
  });
});

describe('Gear live combat stats browser', () => {
  it('initializes and renders the balance-sheet dataset', () => {
    assert.match(gear, /function initBalanceBrowser\(/);
    assert.match(gear, /function renderBalanceBrowser\(/);
    assert.match(gear, /BALANCE_STATS\.items/);
    assert.match(init, /initBalanceBrowser\(\)/);
  });

  it('shows count/status and supports search, category, and stat sorting', () => {
    assert.match(html, /id="gear-balance-count"/);
    assert.match(gear, /balance-search/);
    assert.match(gear, /balance-cat/);
    assert.match(gear, /balance-sort/);
    assert.match(gear, /gear-balance-count/);
    assert.match(css, /\.gear-balance-grid\s*\{[^}]*grid-template-columns:/s);
  });
});
