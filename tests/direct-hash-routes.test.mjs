// Direct hash routes must coexist with base64 share-plan hashes.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const player = readFileSync(join(root, 'src', 'views', 'player.js'), 'utf8');
const init = readFileSync(join(root, 'src', 'app-init.js'), 'utf8');

describe('direct public hash routes', () => {
  it('parses known tab routes and falls back safely for unknown routes', () => {
    assert.match(init, /DIRECT_HASH_ROUTES|parse.*HashRoute/i);
    assert.match(init, /hashchange/);
    assert.match(init, /setView\(['"]calc['"]\)/);
  });

  it('keeps base64 calculator share hashes on the existing plan loader', () => {
    assert.match(init, /loadPlanFromHash/);
    assert.match(player, /decodePlanHash/);
    assert.match(player, /history\.replaceState/);
  });
});
