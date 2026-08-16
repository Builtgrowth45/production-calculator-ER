// tests/more-menu-stacking.test.mjs — More navigation must stay above Settings
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const css = readFileSync(join(root, 'src/styles/surviving-reference.css'), 'utf8');

describe('More navigation stacking', () => {
  it('raises the nav stacking context while the More menu is open', () => {
    assert.match(css, /\.nav-bar:has\(\.nav-more-menu:not\(\[hidden\]\)\)\s*\{[^}]*z-index:\s*\d+/s);
    assert.match(css, /\.nav-more-menu\s*\{[^}]*z-index:\s*\d+/s);
  });

  it('keeps the opened More menu above the Settings control', () => {
    assert.match(css, /\.nav-more:has\(\.nav-more-menu:not\(\[hidden\]\)\)\s*\{[^}]*z-index:\s*\d+/s);
    assert.match(css, /\.nav-more-menu\s*\{[\s\S]*?position:\s*absolute[\s\S]*?z-index:\s*\d+/s);
  });
});
