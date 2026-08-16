// tests/gear-food-boosters.test.mjs — food shares the two booster slots
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const root = join(import.meta.dirname, '..');
const gear = readFileSync(join(root, 'src/views/gear.js'), 'utf8');
const html = readFileSync(join(root, 'index.html'), 'utf8');

const FN_RE = /function\s+gearPickerCategories\s*\([\s\S]*?\n\}/;
const helperSrc = gear.match(FN_RE);
assert.ok(helperSrc, 'gear.js must define gearPickerCategories(slotType, slotCat)');

function pickerCategories(slotType, slotCat) {
  const sandbox = { gearPickerCategories: undefined };
  vm.createContext(sandbox);
  vm.runInContext(helperSrc[0], sandbox);
  return sandbox.gearPickerCategories(slotType, slotCat);
}

function assertCategories(actual, expected) {
  assert.equal(JSON.stringify([...actual]), JSON.stringify(expected));
}

describe('shared food and drug booster slots', () => {
  it('offers both Drugs and Food & Drink in the booster picker', () => {
    assertCategories(pickerCategories('booster', 'Booster'), ['Drugs', 'Food & Drink']);
  });

  it('keeps non-booster pickers category-specific', () => {
    assertCategories(pickerCategories('medikit', 'Medical'), ['Medical']);
    assertCategories(pickerCategories('armor', 'Armor'), ['Armor']);
  });

  it('keeps exactly two shared booster slots in the public shell', () => {
    const slots = [...html.matchAll(/data-slot="booster-(\d+)"/g)].map(m => Number(m[1]));
    assert.deepEqual(slots, [0, 1]);
    assert.match(html, /data-slot="booster-0"[\s\S]*?Booster \/ Food 1/);
    assert.match(html, /data-slot="booster-1"[\s\S]*?Booster \/ Food 2/);
  });
});
