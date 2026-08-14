// tests/gear-picker-equipped-selection.test.mjs — equipped option resolution
// Regression coverage for the verifier-found defect: the gear picker marked
// the equipped option aria-selected / seeded the roving tabindex by reading
// GEAR[slotName] only, so medikit and booster slots never matched their
// equipped piece. Resolution must be slot-type aware:
//   armor   → GEAR[slotName]
//   medikit → MEDIKIT
//   booster → BOOSTERS[slot index parsed from slotName]
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const root = join(import.meta.dirname, '..');
const gear = readFileSync(join(root, 'src', 'views', 'gear.js'), 'utf8');

// Extract the equipped-resolution helper from gear.js and run it in a sandbox
// with the real globals it reads (GEAR / MEDIKIT / BOOSTERS). Fails loudly
// (RED) when the helper does not exist yet.
const FN_RE = /function\s+equippedNameForSlot\s*\([\s\S]*?\n\}/;
const helperSrc = gear.match(FN_RE);
assert.ok(helperSrc, 'gear.js must define equippedNameForSlot(slotName, slotType)');

function resolveEquipped(slotName, slotType, globals) {
  const sandbox = {
    GEAR: globals.GEAR, MEDIKIT: globals.MEDIKIT, BOOSTERS: globals.BOOSTERS,
    equippedNameForSlot: undefined,
  };
  vm.createContext(sandbox);
  vm.runInContext(helperSrc[0], sandbox);
  return sandbox.equippedNameForSlot(slotName, slotType);
}

describe('gear picker equipped option resolution by slot type', () => {
  it('armor slots resolve the equipped piece from GEAR by slot name', () => {
    const name = resolveEquipped('Helmet', 'armor', {
      GEAR: { Helmet: 'X-01 Helmet' },
      MEDIKIT: 'Small MediKit',
      BOOSTERS: ['Booster A'],
    });
    assert.equal(name, 'X-01 Helmet');
  });

  it('medikit slots resolve the equipped piece from MEDIKIT, not GEAR', () => {
    // GEAR['medikit'] is never set — the old GEAR[slotName] lookup returned
    // undefined here, so no option was ever aria-selected for this slot.
    const name = resolveEquipped('medikit', 'medikit', {
      GEAR: {},
      MEDIKIT: 'Battle MediKit',
      BOOSTERS: [],
    });
    assert.equal(name, 'Battle MediKit');
  });

  it('booster slots resolve the equipped piece from BOOSTERS by slot index', () => {
    // slotName 'booster-1' → BOOSTERS[1]; GEAR['booster-1'] is never set.
    const name = resolveEquipped('booster-1', 'booster', {
      GEAR: {},
      MEDIKIT: 'Small MediKit',
      BOOSTERS: ['First Booster', 'Second Booster'],
    });
    assert.equal(name, 'Second Booster');
  });

  it('falls back to GEAR for unknown slot types (default armor contract)', () => {
    const name = resolveEquipped('TorsoArmor', undefined, {
      GEAR: { TorsoArmor: 'T-45 Torso' },
      MEDIKIT: undefined,
      BOOSTERS: [],
    });
    assert.equal(name, 'T-45 Torso');
  });
});

describe('gear picker uses slot-type aware resolution for listbox semantics', () => {
  it('aria-selected compares against the slot-type resolved equipped name', () => {
    // The picker must call the helper (not read GEAR[slotName] directly)
    // when marking options selected / seeding the roving tabindex.
    assert.match(gear, /equippedNameForSlot\(slotName,\s*slotType\)/);
    assert.doesNotMatch(gear, /const equippedName = GEAR\[slotName\]/);
  });

  it('the resolution helper exists near the picker implementation', () => {
    assert.ok(gear.indexOf('function equippedNameForSlot') > -1);
    assert.ok(gear.indexOf('showGearPicker') > gear.indexOf('function equippedNameForSlot'));
  });
});
