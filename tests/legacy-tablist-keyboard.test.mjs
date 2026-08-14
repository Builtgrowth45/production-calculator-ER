// tests/legacy-tablist-keyboard.test.mjs — default legacy tablist keyboard nav
// WAI-ARIA tabs pattern: ArrowLeft/ArrowRight/Home/End move roving focus in
// #legacy-nav, matching the grouped navigation v2 handler without activating.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const appInit = readFileSync(join(root, 'src', 'app-init.js'), 'utf8');

describe('default legacy tablist keyboard navigation', () => {
  it('marks the default navigation as a tablist of tabs', () => {
    assert.match(html, /<nav id="legacy-nav"[^>]*role="tablist"[^>]*>/);
    const tabs = [...html.matchAll(/<button class="tab"[^>]*data-view="[^"]+"[^>]*role="tab"/g)];
    assert.ok(tabs.length >= 7, 'legacy tabs carry role="tab"');
  });

  it('wires arrow and edge-key roving focus on the legacy tablist', () => {
    assert.match(appInit, /getElementById\('legacy-nav'\)/);
    assert.match(appInit, /legacyNav\.addEventListener\('keydown'/);
    assert.match(appInit, /'ArrowRight', 'ArrowLeft', 'Home', 'End'/);
    assert.match(appInit, /preventDefault\(\)/);
    assert.match(appInit, /\.focus\(\)/);
  });
});
