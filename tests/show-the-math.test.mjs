// tests/show-the-math.test.mjs — P3 show-the-math transparency panel
// ============================================================================
// Regression guard for the player-readable "Show the math" disclosure added to
// calculator results (2026-08-14). The panel must:
//   * be an accessible native disclosure (details/summary),
//   * ship in BOTH the single-item and combined-plan result renders,
//   * reuse ONLY the numbers planCost/stepCost/runCost already compute — its
//     headline figures (Investment, Cost/unit, Net faction cost per unit) must match
//     the hero strip exactly, never a second cheaper estimate,
//   * cover recipe time (slot runs/batches), material totals, fees & tax,
//     colony/transport adjustments, and the three headline figures,
//   * stay honest when prices are missing (partial note, no invented numbers).
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

// ---- minimal browser stubs (same shape as harness.mjs / unit-pricing) ----
globalThis.window = {
  matchMedia() { return { matches: false, addEventListener() {} }; },
  location: { pathname: '/', hash: '' }, history: { replaceState() {} },
  navigator: { clipboard: { writeText() { return Promise.resolve(); } } },
  btoa, atob,
};
globalThis.localStorage = { _data: {}, getItem(k) { return this._data[k] || null; }, setItem(k, v) { this._data[k] = v; }, removeItem(k) { delete this._data[k]; } };
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

// ---- Load order matches the browser: data → costs → store → engine → app-core ----
require(join(siteDir, 'src', 'game_data.js'));
require(join(siteDir, 'src', 'costs.js'));
require(join(siteDir, 'src', 'store.js'));
require(join(siteDir, 'src', 'factions.js'));
const engine = require(join(siteDir, 'src', 'engine.js'));
vm.runInThisContext(readFileSync(join(siteDir, 'src', 'app-core.js'), 'utf8'), { filename: 'app-core.js' });

const appSrc = readFileSync(join(siteDir, 'src', 'app.js'), 'utf8');

// Fresh public profile: unaffiliated, no invented colony holdings, no rebate.
// planCost lives in app-core (loaded above into the shared realm).
const { compute } = engine;
// Strip thousands separators and any leading sign/space so number assertions
// are locale-independent ('+ 5,548 UC' → 5548, '− 123.4 UC' → 123.4).
const flat = s => String(s).replace(/,/g, '');
const num = s => parseFloat(flat(s).replace(/^[^\d.-]*/, ''));
// Value of a show-math line by its exact label.
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

describe('show-the-math panel (shipped app-core renderer)', () => {
  it('renders an accessible native disclosure (details/summary + section headings)', () => {
    const res = compute([{ item: 'Linner PP7', qty: 2 }], {}, {}, null, 'Berlin', null);
    const html = showTheMathPanel(res.plan);
    assert.match(html, /<details class="show-math" data-show-math>/);
    assert.match(html, /<summary>Show the math<\/summary>/);
    const headings = html.match(/<h4 class="show-math-title">/g) || [];
    assert.ok(headings.length >= 5, `expected recipe-time/materials/fees/colony/headline sections, got ${headings.length}`);
    // Player-readable sections named for what they explain.
    assert.match(html, /Recipe time/);
    assert.match(html, /Material totals/);
    assert.match(html, /Fees and tax/);
    assert.match(html, /Colony and transport adjustments/);
    assert.match(html, /Headline figures/);
  });

  it('ships in BOTH the single-plan and combined-plan result renders', () => {
    const hits = (appSrc.match(/showTheMathPanel\(\s*plan\s*\)/g) || []);
    assert.ok(hits.length >= 2,
      `renderPlan and runMultiPlan should both include the panel (found ${hits.length})`);
  });

  it('Investment line equals planCost.grand and spells out fees + materials', () => {
    const res = compute([{ item: 'Linner PP7', qty: 2 }], {}, {}, null, 'Berlin', null);
    const cost = planCost(res.plan);
    assert.ok(cost.grand > 0, 'plan should be priced');
    const html = showTheMathPanel(res.plan);
    assert.equal(num(lineVal(html, 'Investment')), Math.round(cost.grand * 100) / 100,
      'Investment must be exactly planCost.grand');
    // The formula text spells out the two billed parts (existing data only).
    const formula = 'fees ' + fmtUC(cost.total) + ' + materials ' + fmtUC(cost.materials);
    assert.ok(flat(html).includes(flat(formula)),
      `panel should spell out the formula "${formula}"`);
  });

  it('Cost/unit and Cost-to-guild match the hero strip figures exactly', () => {
    const res = compute([{ item: 'Linner PP7', qty: 2 }], {}, {}, null, 'Berlin', null);
    const cost = planCost(res.plan);
    const made = produced(res.plan);
    assert.ok(made > 0, 'plan should produce finals');
    const html = showTheMathPanel(res.plan);
    const unit = num(lineVal(html, 'Cost per unit'));
    const guild = num(lineVal(html, 'Net faction cost per unit'));
    assert.ok(Math.abs(unit - cost.grand / made) < 0.01,
      `Cost/unit (${unit}) should equal Investment ÷ units (${cost.grand / made})`);
    assert.ok(Math.abs(guild - (cost.grand - cost.rebate) / made) < 0.01,
      `Net faction cost per unit (${guild}) should equal (Investment − rebate) ÷ units (${(cost.grand - cost.rebate) / made})`);
    // The hero strip prints the same figures — the panel must never diverge.
    const stats = renderPlanStats(res.plan);
    assert.ok(flat(stats).includes(flat(fmtUC(cost.grand))), 'hero Investment should equal planCost.grand');
    assert.ok(flat(stats).includes(flat(fmtUC(cost.grand / made))), 'hero Cost/unit should equal panel');
  });

  it('recipe-time section reports total runs/slot-batches and per-step batch math', () => {
    const res = compute([{ item: 'Emergency MediKit', qty: 300 }], {}, {}, null, 'Berlin', null);
    const cost = planCost(res.plan);
    const html = showTheMathPanel(res.plan);
    assert.ok(cost.runs > 0 && cost.batches > 0, 'plan should have runs');
    assert.ok(flat(html).includes(flat(String(cost.runs)) + ' run'),
      `recipe-time summary should report ${cost.runs} runs`);
    assert.ok(flat(html).includes(flat(String(cost.batches)) + ' slot-batch'),
      `recipe-time summary should report ${cost.batches} slot-batches`);
    // Per-step math uses the SAME arithmetic as the step card: need → runs → made.
    const step = res.plan.steps.find(s => s.item === 'Emergency MediKit');
    assert.ok(step, 'medkit manufacture step should exist');
    const need = step.produced - (step.surplus || 0);
    assert.ok(flat(html).includes('need ' + flat(String(need)) + ' → ' + flat(String(step.batches)) + ' run'),
      `per-step math should show need ${need} → ${step.batches} runs`);
    assert.ok(flat(html).includes('→ ' + flat(String(step.produced)) + ' made'),
      `per-step math should end at ${step.produced} made`);
  });

  it('material-totals section lists per-material quantities and the total', () => {
    const res = compute([{ item: 'Linner PP7', qty: 2 }], {}, {}, null, 'Berlin', null);
    const acquire = Object.entries(res.plan.acquire || {});
    assert.ok(acquire.length > 0, 'plan should acquire materials');
    const total = acquire.reduce((s, [, info]) => s + (info.qty || 0), 0);
    const html = showTheMathPanel(res.plan);
    assert.ok(flat(html).includes(flat(String(total)) + ' unit'),
      `material-totals summary should report ${total} units`);
    acquire.forEach(([item, info]) => {
      assert.match(html, new RegExp(displayName(item).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.ok(flat(html).includes(flat(String(info.qty)) + ' × '),
        `material row should show ${info.qty} × ...`);
    });
  });

  it('transport adjustments list source colonies and the destination', () => {
    // Owned chemicals sit at Manhattan; the medkit plan needs them moved.
    const res = compute([{ item: 'Emergency MediKit', qty: 300 }], {},
      { chemicals: 400, textiles: 600, bioplasma: 300, glass: 300 },
      {
        chemicals: [{ location: 'Manhattan', qty: 400 }],
        textiles: [{ location: 'Berlin', qty: 600 }],
        bioplasma: [{ location: 'Paris', qty: 300 }],
        glass: [{ location: 'Berlin', qty: 300 }],
      }, 'Berlin', null);
    const transport = Object.entries(res.plan.transport || {});
    assert.ok(transport.length > 0, 'plan should move owned stock');
    const html = showTheMathPanel(res.plan);
    assert.match(html, /move \d[\d,]* → Berlin/);
    transport.forEach(([item]) => {
      assert.match(html, new RegExp(displayName(item).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    });
  });

  it('stays honest with unpriced items: partial note, no invented numbers', () => {
    const plan = {
      steps: [{
        item: 'Definitely Not A Real Item', type: 'manufacture', produced: 4, batches: 4,
        outQty: 1, altIndex: null, surplus: 0, inputs: [], resolvedInputs: [],
      }],
      acquire: {}, transport: {}, surplus: {},
    };
    const html = showTheMathPanel(plan);
    assert.match(html, /no price in the cost data|partial/i);
    assert.doesNotMatch(html, /≈ \d/, 'unpriced plan must not invent numbers');
  });

  it('empty plan renders without crashing and says nothing runs', () => {
    const html = showTheMathPanel({ steps: [], acquire: {}, transport: {}, surplus: {} });
    assert.match(html, /<details class="show-math"/);
    assert.match(html, /No production runs/);
  });
});
