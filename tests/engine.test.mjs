// tests/engine.test.mjs — engine correctness tests
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mod from './harness.mjs';

const {
  compute, applyPlan, FINAL_ITEMS, RECIPES_BY_OUTPUT, ALL_ITEMS,
  setTestInv, setPlayerInv, getPlayerInv, reset, refreshAll, STORE
} = mod;

before(() => reset());
after(() => reset());

describe('player selection state', () => {
  it('selects a remote player when no active player exists', () => {
    reset();
    STORE.PLAYERS.players = { 'Remote Player': [] };
    STORE.PLAYERS.active = '';

    assert.equal(STORE.ensureActivePlayer(), 'Remote Player');
    assert.equal(STORE.PLAYERS.active, 'Remote Player');
  });
});

// ---- T1a: CryoTech Medigun CM2 — no duplicates, expected step count ----
// CM2 has 2 production paths (plastic-syntactic-foam path / carbon-fiber path).
// The engine picks ONE path, so the plan is 6 steps — NOT the 8-input flat
// concatenation of the pre-split data (which produced 7 steps). Fixed with the
// 2026-08-07 path-split (EcoLordsheet recipe grouping restored inputs_alternatives).
describe('T1a — CryoTech Medigun CM2 aggregate plan', () => {
  it('produces exactly 6 steps with no duplicate items', () => {
    setTestInv({}, {});
    const result = compute('CryoTech Medigun CM2', 1, {});
    const steps = result.plan.steps;
    assert.equal(steps.length, 6, `expected 6 steps, got ${steps.length}`);

    const items = steps.map(s => s.item);
    const dupes = items.filter((it, i) => items.indexOf(it) !== i);
    assert.deepEqual(dupes, [], `duplicate steps found: ${dupes.join(', ')}`);
  });
});

// ---- T1b: Dominator empty-inventory — exact acquire numbers ----
// Dominator has 2 production paths (titanium alloy / titanium syntactic foam).
// The engine picks ONE path (path 0: titanium alloy×2 + plastic syntactic
// foam×4 + glass×1 + carbon fiber×2), so acquire is much smaller than the
// pre-split flat 8-input recipe (which summed BOTH paths: titanium 12, bauxite
// 14, chrome 6, mineral oil 36). Values below = the single-path plan.
describe('T1b — Dominator acquire quantities (empty inventory)', () => {
  it('matches the theoretical minimums', () => {
    setTestInv({}, {});
    const result = compute('Aurelian Technologies Dominator', 1, {});
    const acq = result.plan.acquire;

    assert.equal(acq['titanium']?.qty, 4, `titanium: ${acq['titanium']?.qty}`);
    assert.equal(acq['bauxite']?.qty, 6, `bauxite: ${acq['bauxite']?.qty}`);
    assert.equal(acq['chrome']?.qty, 2, `chrome: ${acq['chrome']?.qty}`);
    assert.equal(acq['mineral oil']?.qty, 24, `mineral oil: ${acq['mineral oil']?.qty}`);
    assert.equal(acq['Chemical Substances']?.qty, 5, `Chemical Substances: ${acq['Chemical Substances']?.qty}`);
    assert.equal(acq['silicon']?.qty, 3, `silicon: ${acq['silicon']?.qty}`);
  });
});

// ---- T1c: Partial-owned intermediate — bauxite must drop ----
describe('T1c — partial-owned intermediate', () => {
  it('does not over-acquire bauxite when aluminum is partially owned', () => {
    setTestInv(
      { aluminum: 3 },
      { aluminum: [{ location: 'apartment', qty: 3 }] }
    );
    const result = compute('Aurelian Technologies Dominator', 1, {});
    const acq = result.plan.acquire;

    // Chosen path (titanium alloy×2 + plastic syntactic foam×4 + glass×1 +
    // carbon fiber×2) needs 3 aluminum total (2 for titanium alloy, 1 for
    // glass). All 3 are owned → bauxite must be 0 (pre-split flat data
    // over-acquired bauxite 14/8 because it summed BOTH paths).
    const bauxite = acq['bauxite']?.qty ?? 0;
    assert.equal(bauxite, 0, `bauxite should be 0 with all aluminum owned (currently ${bauxite})`);
    assert.equal(acq['titanium']?.qty, 4, `titanium: ${acq['titanium']?.qty}`);
  });
});

// ---- T1d: Shared ledger — multi-item tray no double-counting ----
describe('T1d — shared ledger across tray items', () => {
  it('does not double-count owned stock in combined plans', () => {
    setTestInv(
      { 'metal alloy': 5, chemicals: 2 },
      {
        'metal alloy': [{ location: 'apartment', qty: 5 }],
        chemicals: [{ location: 'apartment', qty: 2 }],
      }
    );
    const result = compute(
      [
        { item: 'Aurelian Technologies Bio Rounds', qty: 4 },
        { item: 'Aurelian Technologies Bio Rounds', qty: 4 },
      ],
      {}
    );
    const tr = result.plan.transport;
    const acq = result.plan.acquire;

    // Each owned item transported exactly once
    assert.equal(tr['metal alloy']?.qty, 5, 'metal alloy transport');
    assert.equal(tr['chemicals']?.qty, 2, 'chemicals transport');

    // With owned metal alloy 5 / chemicals 2, producing 8 total Bio Rounds:
    // Need 10 metal alloy → produce 5 → 3 batches (iron×3, chrome×3)
    // Need 4 chemicals → produce 2 → 2 batches (Chemical Substances×2)
    assert.equal(acq['iron']?.qty, 3, 'iron acquire');
    assert.equal(acq['chrome']?.qty, 3, 'chrome acquire');
    assert.equal(acq['Chemical Substances']?.qty, 2, 'Chemical Substances acquire');
  });
});

// ---- T1f: multi-item compute() with explicit ledger (regression) ----
// app.js calls compute(items, chosen, extLedger, extInvLoc, dest, discounts);
// a past bug shifted these args by one so the ledger landed in an ignored slot.
describe('T1f — array-form compute honours an explicit external ledger', () => {
  it('uses the passed ledger, not the global inventory', () => {
    // Global inventory says we own nothing…
    setTestInv({}, {});
    // …but the explicit ledger says we own 5 metal alloy at the apartment.
    const ledger = { 'metal alloy': 5 };
    const invLoc = { 'metal alloy': [{ location: 'apartment', qty: 5 }] };
    const result = compute(
      [{ item: 'Aurelian Technologies Bio Rounds', qty: 4 }],
      {}, ledger, invLoc, 'Berlin', { prod: 0, mine: 0, trans: 0 }
    );
    // Need 5 metal alloy total → all covered by the ledger → transported, none produced
    assert.equal(result.plan.transport['metal alloy']?.qty, 5, 'metal alloy transported from ledger');
    assert.deepEqual(result.plan.transport['metal alloy']?.from, ['apartment'], 'sourced from apartment');
    const alloySteps = result.plan.steps.filter(s => s.item === 'metal alloy');
    assert.equal(alloySteps.length, 0, 'no metal alloy production step needed');
  });
});

// ---- T1e: applyPlan must consume intermediates (FAILS until T3) ----
describe('T1e — applyPlan consumes inputs correctly (fails until T3)', () => {
  it('does not inflate intermediate inventory', () => {
    reset();
    setPlayerInv([
      // Raw materials that would need to be acquired — simulate having mined them
      { item: 'iron', location: 'apartment', quantity: 10 },
      { item: 'chrome', location: 'apartment', quantity: 10 },
      { item: 'chemicals', location: 'apartment', quantity: 10 },
    ]);
    const result = compute('Aurelian Technologies Bio Rounds', 4, {});
    applyPlan(result, 'Berlin');

    const inv = getPlayerInv();
    const totals = {};
    inv.forEach(e => {
      totals[e.item] = (totals[e.item] || 0) + e.quantity;
    });

    console.log('  inventory after apply:', JSON.stringify(totals));

    // applyPlan moves owned stock to Berlin, produces items, and deducts inputs.
    // iron: 10 - 3 (consumed for metal alloy) = 7
    // chrome: 10 - 3 (consumed for metal alloy) = 7
    // chemicals: 10 - 2 (consumed for Bio Rounds) = 8
    // metal alloy: 6 produced - 5 consumed = 1
    const expected = {
      iron: 7, chrome: 7, chemicals: 8,
      'metal alloy': 1, 'Aurelian Technologies Bio Rounds': 4,
    };
    for (const [item, qty] of Object.entries(expected)) {
      const actual = totals[item] || 0;
      assert.equal(actual, qty, `${item}: expected ${qty}, got ${actual}`);
    }
  });
});
