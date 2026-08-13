// Retired public surfaces must not remain in the shipped shell.
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const root = join(import.meta.dirname, '..');
const read = file => readFileSync(join(root, file), 'utf8');

describe('retired public surfaces', () => {
  it('removes retired tabs and their navigation labels', () => {
    const html = read('index.html');
    for (const label of ['Requests', 'Weapons', 'Analytics', 'All Items', 'Client RE', 'Factions', 'Knowledge Base', 'Help Fix Data']) {
      assert.doesNotMatch(html, new RegExp(label));
    }
  });
});
