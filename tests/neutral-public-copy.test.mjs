// Public-facing neutral language contract.
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const root = join(import.meta.dirname, '..');
const read = file => readFileSync(join(root, file), 'utf8');

describe('neutral public knowledge surfaces', () => {
  it('does not present the Academy as CMG-only or membership-gated', () => {
    const html = read('index.html');
    const view = read('src/views/academy.js');
    assert.doesNotMatch(html, /CMG Academy/);
    assert.doesNotMatch(view, /CMG Academy.*member knowledge base/);
    assert.match(html, /Empire Rising Knowledge Base|Community Knowledge Base/);
  });

  it('keeps factual attribution while removing guild-only product copy', () => {
    const source = read('academy/README.md');
    const help = read('data-help.html');
    assert.match(source, /Colonization & Mining Guild|CMG/);
    assert.doesNotMatch(source, /The guild's edge|membership required|members only/i);
    assert.doesNotMatch(help, /CMG Guild Production Planner/);
    assert.match(help, /Empire Rising Production Calculator/);
  });
});
