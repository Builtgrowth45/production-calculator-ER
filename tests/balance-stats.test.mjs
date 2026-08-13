// tests/balance-stats.test.mjs — live ER Balance Sheet ingest regression
// Guards the data/balance_stats.json → src/balance_stats.js pipeline and the
// merge into recipe output.stats (scripts/update_balance_stats.py):
//   - the generated window.BALANCE_STATS loads with all items + stats
//   - every balance item that maps to a recipe agrees with that recipe's
//     output.stats on the sheet-provided keys (sheet is authoritative)
//   - the previously-empty armor stat gaps are filled
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadClassic(file) {
  const src = readFileSync(join(root, file), 'utf8');
  const ctx = { window: {}, console };
  ctx.window.window = ctx.window;
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: file });
  return ctx.window;
}

const balWin = loadClassic('src/balance_stats.js');
const gameWin = loadClassic('src/game_data.js');
const BALANCE = balWin.BALANCE_STATS;
const DATA = gameWin.GAME_DATA;

// Same matcher as scripts/update_balance_stats.py (kept in sync deliberately).
function norm(s) {
  return String(s || '').toLowerCase()
    .replace(/\s*\((male|female)\)/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim()
    .replace(/med\s?ikit/g, 'medkit');
}
const ALIASES = {
  'infensus minimist gloves': 'infensus minimalist gloves',
  'pythica sustained gloves': 'pythica sustained battle gloves',
};
function resolve(n) {
  return ALIASES[n] || n;
}
const recipeByNorm = new Map();
for (const r of DATA.recipes) recipeByNorm.set(norm(r.output.item), r);
function findRecipe(name) {
  const c = resolve(norm(name));
  return recipeByNorm.get(c) || null;
}

describe('live balance sheet ingest', () => {
  it('BALANCE_STATS loads with meta and every item has a name + stats object', () => {
    assert.ok(BALANCE, 'window.BALANCE_STATS undefined');
    assert.equal(BALANCE.items.length, 386);
    assert.match(BALANCE._meta.source, /Balance Sheet/);
    for (const it of BALANCE.items) {
      assert.ok(it.name && it.name.length, 'item missing name');
      assert.ok(it.stats && typeof it.stats === 'object', `${it.name}: stats not object`);
    }
  });

  it('stat keys all have labels in the app (no raw-key leakage)', () => {
    const labels = (() => {
      const src = readFileSync(join(root, 'src', 'app-core.js'), 'utf8');
      const m = src.match(/const STAT_LABELS = \{([\s\S]*?)\n\};/);
      const keys = new Set();
      const re = /([a-z_]+)\s*:/g;
      let x;
      while ((x = re.exec(m[1]))) keys.add(x[1]);
      return keys;
    })();
    for (const it of BALANCE.items) {
      for (const k of Object.keys(it.stats)) {
        assert.ok(labels.has(k) || k === 'classification', `${it.name}: stat key '${k}' has no STAT_LABELS entry`);
      }
    }
  });

  it('merged recipe stats agree with the sheet on every sheet-provided key', () => {
    let checked = 0;
    for (const it of BALANCE.items) {
      if (!Object.keys(it.stats).length) continue;
      const recipe = findRecipe(it.name);
      if (!recipe) continue;
      checked++;
      const rs = recipe.output.stats || {};
      for (const [k, v] of Object.entries(it.stats)) {
        assert.ok(k in rs, `${recipe.output.item}: sheet key '${k}' missing from recipe stats`);
        assert.equal(rs[k], v, `${recipe.output.item}: ${k} recipe=${rs[k]} sheet=${v}`);
      }
    }
    assert.ok(checked > 250, `expected >250 matched recipes, got ${checked}`);
  });

  it('previously-empty armor stat gaps are now filled', () => {
    const gaps = [
      'Infensus Minimalist Gloves',
      'Pythica Sustained Battle Gloves',
      'XenoTech Expeditionary Shoulder Pads',
    ];
    for (const g of gaps) {
      const r = DATA.recipes.find(rr => rr.output.item === g);
      assert.ok(r, `${g}: recipe missing`);
      assert.ok(r.output.stats && Object.keys(r.output.stats).length > 0, `${g}: stats still empty`);
    }
  });

  it('known live values landed (drug durations 360s, weapon agility −1)', () => {
    const amyl = DATA.recipes.find(r => r.output.item === 'Amyl Nitrate');
    assert.equal(amyl.output.stats.durationseconds, 360);
    const rgi = DATA.recipes.find(r => r.output.item === 'RGI-9');
    assert.equal(rgi.output.stats.agility, -1);
  });
});
