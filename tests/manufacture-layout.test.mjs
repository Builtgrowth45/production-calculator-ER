import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const core = readFileSync(join(root, 'src/app-core.js'), 'utf8');
const css = readFileSync(join(root, 'src/styles.css'), 'utf8');

describe('compact manufacture section layout', () => {
  it('marks final manufacture cards as compact without removing their shared renderer', () => {
    assert.match(core, /recipe-card \$\{s\.process\}\$\{isFinal \? ' compact-manufacture' : ''\}/);
    assert.match(core, /function stepCard\(s, isFinal\)/);
  });

  it('lays manufacture cards out as a responsive grid', () => {
    assert.match(css, /\.section\[data-section="manufacture"\] \.section-content\s*\{[^}]*display:\s*grid/s);
    assert.match(css, /\.section\[data-section="manufacture"\] \.section-content\s*\{[^}]*repeat\(auto-fit/s);
  });

  it('keeps manufacture cards compact horizontally on wide screens', () => {
    assert.match(css, /\.recipe-card\.compact-manufacture \.recipe-flow\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto minmax\(240px, 0\.8fr\)/s);
    assert.match(css, /\.recipe-card\.compact-manufacture \.flow-arrow\.big\s*\{[^}]*transform:\s*none/s);
  });

  it('returns manufacture cards to the vertical flow on narrow screens', () => {
    assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*\.recipe-card\.compact-manufacture \.recipe-flow\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s);
    assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*\.recipe-card\.compact-manufacture \.flow-arrow\.big\s*\{[^}]*transform:\s*rotate\(90deg\)/s);
  });
});
