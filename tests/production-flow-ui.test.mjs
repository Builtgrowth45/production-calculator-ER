// tests/production-flow-ui.test.mjs — accessible spatial emphasis contract
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = readFileSync(join(root, 'src', 'app.js'), 'utf8');
const css = readFileSync(join(root, 'src', 'styles', 'components.css'), 'utf8');

describe('accessible production-flow emphasis', () => {
  it('adds a non-semantic visual rail without moving dependency data into WebGL', () => {
    assert.match(app, /calc-path-flow/);
    assert.match(app, /aria-hidden="true"/);
    assert.doesNotMatch(app, /Canvas|WebGL|THREE/);
  });

  it('keeps the semantic path controls and reduced-motion state', () => {
    assert.match(app, /aria-label="Refinement path for/);
    assert.match(css, /prefers-reduced-motion: reduce/);
  });
});
