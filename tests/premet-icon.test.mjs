import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const item = 'PreMet Tremor Leg Pads';
const id = item.toLowerCase();
const iconPath = join(root, 'icons', `${id}.png`);

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(root, relativePath), 'utf8'));
}

test('PreMet Tremor Leg Pads has the client-derived icon and metadata', () => {
  assert.equal(existsSync(iconPath), true, `missing ${iconPath}`);

  const png = readFileSync(iconPath);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), 48);
  assert.equal(png.readUInt32BE(20), 48);

  const gameData = readJson('data/game_data.json');
  const recipe = gameData.recipes.find((entry) => entry.output?.item === item);
  assert.ok(recipe, `${item} recipe is missing`);
  assert.equal(recipe.output.quantity, 3);

  const catalog = readJson('icons/icon_catalog.json');
  const catalogEntry = catalog.icons.find((entry) => entry.id === id);
  assert.ok(catalogEntry, `${item} catalog entry is missing`);
  assert.equal(catalogEntry.icon, `${id}.png`);
  assert.equal(catalogEntry.has_icon, true);

  const iconHashes = readJson('data/icon_hashes.json');
  assert.equal(iconHashes[id], 2170205185110710280);
});
