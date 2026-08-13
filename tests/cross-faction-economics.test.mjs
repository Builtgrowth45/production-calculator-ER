// Cross-faction economic invariants.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import mod from './harness.mjs';

const require = createRequire(import.meta.url);
const root = join(import.meta.dirname, '..');
require(join(root, 'src', 'costs.js'));
const { netPathCost, reset } = mod;

function ownedFor(faction) {
  window.ENGINE_COLONY_OWNED = loc => loc === 'Paris' || loc === 'Andromeda';
  window.ENGINE_COLONY_REBATE_FOR = () => ({ CMG: 0.85, EC: 0, UNAFFILIATED: 0 }[faction] ?? 0);
  window.OBTAIN_SITE = { coal: 'Andromeda' };
}

describe('cross-faction economic invariants', () => {
  it('keeps gross cost stable and faction return explicit', () => {
    const gross = 288;
    ownedFor('UNAFFILIATED');
    const unaffiliated = netPathCost('carbon', 1, 'Paris', {}, 0);
    ownedFor('EC');
    const ec = netPathCost('carbon', 1, 'Paris', {}, 0);
    ownedFor('CMG');
    const cmg = netPathCost('carbon', 1, 'Paris', {}, 0);
    assert.equal(unaffiliated, gross);
    assert.equal(ec, gross);
    assert.equal(cmg, 43.2);
    assert.ok(cmg < ec);
  });

  it('does not apply a return when the selected faction does not own the colony', () => {
    window.OBTAIN_SITE = {};
    window.ENGINE_COLONY_OWNED = () => false;
    window.ENGINE_COLONY_REBATE_FOR = () => 0.85;
    assert.equal(netPathCost('carbon', 1, 'Paris', {}, 0), 288);
  });

  it('clamps malformed return policies to the safe range', () => {
    window.OBTAIN_SITE = { coal: 'Andromeda' };
    window.ENGINE_COLONY_OWNED = () => true;
    window.ENGINE_COLONY_REBATE_FOR = () => 2;
    assert.equal(netPathCost('carbon', 1, 'Paris', {}, 0), 0);
    window.ENGINE_COLONY_REBATE_FOR = () => -1;
    assert.equal(netPathCost('carbon', 1, 'Paris', {}, 0), 288);
  });

  it('does not depend on legacy CMG-only numeric hook when callback exists', () => {
    window.OBTAIN_SITE = { coal: 'Andromeda' };
    window.ENGINE_COLONY_OWNED = () => true;
    window.ENGINE_COLONY_REBATE = 0.85;
    window.ENGINE_COLONY_REBATE_FOR = () => 0;
    assert.equal(netPathCost('carbon', 1, 'Paris', {}, 0), 288);
    delete window.ENGINE_COLONY_REBATE_FOR;
    assert.equal(netPathCost('carbon', 1, 'Paris', {}, 0), 43.2);
  });
});

reset();
