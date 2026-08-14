// tests/show-the-math-colony.test.mjs — show-the-math under colony tax & rebate
// ============================================================================
// Same panel as show-the-math.test.mjs, but the world is SEEDED before app-core
// loads (Berlin taxed 25%, owned by CMG) and the active player is CMG, so the
// plan's colony tax and faction-return lines are exercised. The panel must
// quote exactly what planCost reports — tax line = cost.tax, return line =
// cost.rebate — and the guild formula must be (Investment − rebate) ÷ units.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const siteDir = join(__dirname, '..');
const require = createRequire(import.meta.url);

// ---- minimal browser stubs (same shape as harness.mjs) ----
globalThis.window = {
  matchMedia() { return { matches: false, addEventListener() {} }; },
  location: { pathname: '/', hash: '' }, history: { replaceState() {} },
  navigator: { clipboard: { writeText() { return Promise.resolve(); } } },
  btoa, atob,
};
globalThis.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = v; },
  removeItem(k) { delete this._data[k]; },
};
globalThis.document = {
  getElementById() { return null; }, querySelectorAll() { return []; },
  createElement(tag) { return { tagName: tag, classList: { add(){}, remove(){}, toggle(){}, contains(){} }, addEventListener(){}, setAttribute(){}, getAttribute(){ return null; }, appendChild(c){ return c; }, querySelector(){ return null; }, closest(){ return null; }, style:{}, dataset:{}, innerHTML:'', textContent:'', value:'', checked:false, hidden:false, click(){}, focus(){} }; },
  addEventListener() {}, querySelector() { return null; }, body: { appendChild(c){ return c; }, querySelector(){ return null; } },
  documentElement: { dataset: {}, setAttribute() {} },
};
globalThis.schedulePushInv = function () {};
globalThis.refreshAll = function () {};
globalThis.OBTAIN_SITE = {};
window.OBTAIN_SITE = globalThis.OBTAIN_SITE;

// Seed the shared colony world BEFORE app-core loads: Berlin taxed at 25% and
// owned by CMG. This is the same localStorage key the Colonies tab writes.
globalThis.localStorage._data['er_colony_world_v2'] = JSON.stringify({
  schema_version: 2, defaults_initialized: true,
  owner: { Berlin: ['CMG'] },
  tax: { Berlin: 25 },
});

// ---- Load order matches the browser: data → costs → store → engine → factions → app-core ----
require(join(siteDir, 'src', 'game_data.js'));
require(join(siteDir, 'src', 'costs.js'));
require(join(siteDir, 'src', 'store.js'));
require(join(siteDir, 'src', 'factions.js'));
const engine = require(join(siteDir, 'src', 'engine.js'));
vm.runInThisContext(readFileSync(join(siteDir, 'src', 'app-core.js'), 'utf8'), { filename: 'app-core.js' });

// Active player is CMG (85% return at owned colonies).
window.STORE.PLAYERS.players = { T: [] };
window.STORE.PLAYERS.profiles = { T: { faction: 'CMG' } };
window.STORE.PLAYERS.active = 'T';
window.STORE.recomputeInv();

const { compute } = engine;
const flat = s => String(s).replace(/,/g, '');
const num = s => parseFloat(flat(s).replace(/^[^\d.-]*/, ''));
function lineVal(html, label) {
  const re = new RegExp('<span class="show-math-line-label">' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '</span>[\\s\\S]*?<span class="show-math-line-val">([^<]*)</span>');
  const m = html.match(re);
  assert.ok(m, `expected a show-math line labelled "${label}"`);
  return m[1].trim();
}
function produced(plan) {
  return plan.steps.filter(s => s.type === 'manufacture' && s.produced > 0)
    .reduce((s, x) => s + x.produced, 0);
}

describe('show-the-math under colony tax and faction rebate', () => {
  it('colony tax line equals planCost.tax', () => {
    const res = compute([{ item: 'Linner PP7', qty: 2 }], {}, {}, null, 'Berlin', null);
    const cost = planCost(res.plan);
    assert.ok(cost.tax > 0.005, 'seeded Berlin 25% tax should produce a tax line');
    const html = showTheMathPanel(res.plan);
    assert.equal(num(lineVal(html, 'colony tax')), Math.round(cost.tax * 100) / 100,
      'colony tax must be exactly planCost.tax');
  });

  it('faction-return line equals planCost.rebate and spells out the guild formula', () => {
    const res = compute([{ item: 'Linner PP7', qty: 2 }], {}, {}, null, 'Berlin', null);
    const cost = planCost(res.plan);
    assert.ok(cost.rebate > 0.005, 'CMG owning Berlin should earn a rebate');
    const html = showTheMathPanel(res.plan);
    assert.equal(num(lineVal(html, 'faction return')), Math.round(cost.rebate * 100) / 100,
      'faction return must be exactly planCost.rebate');
    // The guild headline is (Investment − rebate) ÷ units, matching the hero.
    const made = produced(res.plan);
    const guild = num(lineVal(html, 'Cost to guild per unit'));
    assert.ok(Math.abs(guild - (cost.grand - cost.rebate) / made) < 0.01,
      `Cost to guild/unit (${guild}) should equal (${cost.grand} − ${cost.rebate}) ÷ ${made}`);
    assert.match(html, /back to Colonization and Mining Guild/);
    // Cost/unit is unaffected by the rebate and still equals grand ÷ units.
    const unit = num(lineVal(html, 'Cost per unit'));
    assert.ok(Math.abs(unit - cost.grand / made) < 0.01);
  });

  it('hero and panel agree under tax + rebate (no drift between the two paths)', () => {
    const res = compute([{ item: 'Linner PP7', qty: 2 }], {}, {}, null, 'Berlin', null);
    const cost = planCost(res.plan);
    const made = produced(res.plan);
    const stats = renderPlanStats(res.plan);
    const panel = showTheMathPanel(res.plan);
    assert.ok(flat(stats).includes(flat(fmtUC(cost.grand))), 'hero Investment should equal grand');
    assert.ok(flat(stats).includes(flat(fmtUC(cost.grand / made))), 'hero Cost/unit should match');
    assert.ok(flat(stats).includes(flat(fmtUC((cost.grand - cost.rebate) / made))), 'hero guild figure should match');
    assert.equal(num(lineVal(panel, 'Investment')), Math.round(cost.grand * 100) / 100);
    assert.equal(num(lineVal(panel, 'Cost per unit')), Math.round(cost.grand / made * 100) / 100);
    assert.equal(num(lineVal(panel, 'Cost to guild per unit')), Math.round((cost.grand - cost.rebate) / made * 100) / 100);
  });
});
