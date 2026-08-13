// tests/cmg-net-path.test.mjs — CMG net-cost alternative path picking
// ============================================================================
// Regression guard for the 2026-08-07 fix: the engine's alternative-path picker
// used to be price-blind (stock-coverage heuristic only), so a gear set could
// report 56 mineral oil for carbon fiber while coal — cheaper at sticker AND
// mined on CMG-owned Andromeda — was the real lowest-cost path for the guild.
// With window.COSTS loaded and the colony hooks installed (as app-core.js does
// in the browser), pickAlternativeIndex must choose the cheapest NET path for
// CMG: processing fee at the destination plus materials at their mine site,
// each × (1 − FACTION_REBATE) where CMG owns the colony.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mod from './harness.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const siteDir = join(__dirname, '..');
const require = createRequire(import.meta.url);

const {
  compute, setPlayerInv, reset, RECIPES_BY_OUTPUT, netPathCost, pickAlternativeIndex,
} = mod;

before(() => {
  // Same load order as the browser: costs.js provides window.COSTS.
  require(join(siteDir, 'src', 'costs.js'));
});
after(() => reset());

// CMG owns Paris + Andromeda by default (app-core's CMG_HOLDINGS). Install the
// same hooks app-core.js installs, so the engine sees the rebate.
const installHooks = () => {
  window.ENGINE_COLONY_OWNED = (loc) => loc === 'Paris' || loc === 'Andromeda';
  window.ENGINE_COLONY_REBATE = 0.85;
};
const removeHooks = () => {
  delete window.ENGINE_COLONY_OWNED;
  delete window.ENGINE_COLONY_REBATE;
};

describe('CMG net-cost alternative path picking', () => {
  it('carbon: coal path (alt 1) is the cheapest NET path for CMG at Paris', () => {
    installHooks();
    const memo = {};
    const costs = [0, 1, 2].map(i => netPathCost('carbon', i, 'Paris', memo, 0));
    assert.ok(costs.every(c => c != null), 'all three carbon paths should be priced');
    // coal: 162 fee × 0.15 + 3 × 42 × 0.15 = 43.2 ; oil: 168 × 0.15 + 2 × 66 = 157.2
    assert.ok(costs[1] < costs[0], `coal path (${costs[1]}) should beat mineral oil (${costs[0]})`);
    assert.ok(costs[1] < costs[2], `coal path (${costs[1]}) should beat anthracite (${costs[2]})`);
  });

  it('pickAlternativeIndex chooses coal for carbon with hooks installed', () => {
    installHooks();
    const recipe = RECIPES_BY_OUTPUT['carbon'][0];
    assert.equal(pickAlternativeIndex(recipe, null, 28, 'Paris'), 1);
  });

  it('5-piece armor set acquires 84 coal, not 56 mineral oil (empty inventory)', () => {
    installHooks();
    setPlayerInv([]);
    const pieces = ['Pythica Durable Battle Helmet','Aramid Modified Shoulder Pads',
      'Pythica Mobile Infantry Torso Armor','Aramid Modified Arm Pads','Infensus Heavy Gloves'];
    const res = compute(pieces.map(i => ({ item: i, qty: 1 })), {}, {}, null, 'Paris', null);
    assert.equal(res.plan.acquire['coal']?.qty, 84, `expected 84 coal, got ${JSON.stringify(res.plan.acquire.coal)}`);
    assert.equal(res.plan.acquire['mineral oil'], undefined, 'should not acquire mineral oil');
    const step = res.plan.steps.find(s => s.item === 'carbon');
    assert.equal(step?.altIndex, 1, 'carbon step should use the coal path');
  });

  it('explicit player choice still wins over cost-aware picking', () => {
    installHooks();
    setPlayerInv([]);
    const recipe = RECIPES_BY_OUTPUT['carbon'][0];
    // chosen = 0 (mineral oil) must be honoured even though coal is cheaper.
    assert.equal(pickAlternativeIndex(recipe, 0, 28, 'Paris'), 0);
  });

  it('falls back to sticker price when no colony hooks are installed', () => {
    removeHooks();
    const memo = {};
    const c = netPathCost('carbon', 1, 'Paris', memo, 0);
    // Without the rebate the coal path costs 162 + 3×42 = 288 (still cheapest,
    // but now the full sticker price).
    assert.ok(Math.abs(c - 288) < 0.001, `expected 288 sticker, got ${c}`);
  });

  it('honours a pinned OBTAIN_SITE when estimating path cost', () => {
    installHooks();
    // Pin coal to DeMorgan's Castle (NOT CMG-owned) — the rebate must disappear
    // and the coal path must cost its full sticker price (162×0.15 + 3×42).
    window.OBTAIN_SITE = { coal: "DeMorgan's Castle" };
    const memo = {};
    const pinned = netPathCost('carbon', 1, 'Paris', memo, 0);
    assert.ok(Math.abs(pinned - 150.3) < 0.01, `expected 150.3 with pin, got ${pinned}`);

    // Pin coal back to our own Andromeda — rebate applies again (162×0.15 + 3×42×0.15).
    window.OBTAIN_SITE = { coal: 'Andromeda' };
    const memo2 = {};
    const owned = netPathCost('carbon', 1, 'Paris', memo2, 0);
    assert.ok(Math.abs(owned - 43.2) < 0.01, `expected 43.2 with owned pin, got ${owned}`);
    delete window.OBTAIN_SITE;
  });
});
