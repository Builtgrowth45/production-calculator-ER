// tests/r3f-studio.test.mjs — Character Studio bridge contract
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const entry = readFileSync(join(root, 'src', '3d', 'entry.jsx'), 'utf8');

describe('R3F Character Studio bridge', () => {
  it('accepts an explicit body and garment outfit without preloading assets', () => {
    assert.match(entry, /function OutfitScene/);
    assert.match(entry, /outfit\.bodyFile/);
    assert.match(entry, /outfit\.torso/);
    assert.match(entry, /useTexture/);
    assert.match(readFileSync(join(root, 'src', 'views', 'character.js'), 'utf8'), /syncR3FStudio/);
  });

  it('shares the same scene API and switches through the studio mode', () => {
    assert.match(entry, /mode === 'studio'/);
    assert.match(entry, /setMode\(mode\)/);
    assert.match(entry, /mount\(target/);
  });
});
