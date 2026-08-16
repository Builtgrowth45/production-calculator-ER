// tests/gear-stats-fallback.test.mjs — EC Aramid armor stats remain consistent
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const data = JSON.parse(readFileSync(join(root, 'data', 'game_data.json'), 'utf8'));

function recipeFor(item) {
  return data.recipes.find((recipe) => recipe.output?.item === item);
}

describe('EC Aramid armor stats', () => {
  it('gives Aramid Altered Shoulder Pads the same stats as the other EC Aramid shoulder pads', () => {
    const altered = recipeFor('Aramid Altered Shoulder Pads');
    const reference = recipeFor('Aramid Modified Shoulder Pads');

    assert.ok(altered, 'Aramid Altered Shoulder Pads recipe must exist');
    assert.ok(reference, 'Aramid Modified Shoulder Pads reference recipe must exist');
    assert.deepEqual(altered.output.stats, reference.output.stats);
  });
});
