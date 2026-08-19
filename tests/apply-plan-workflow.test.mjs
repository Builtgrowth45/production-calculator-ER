import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const app = readFileSync(join(root, 'src/app.js'), 'utf8');
const init = readFileSync(join(root, 'src/app-init.js'), 'utf8');
const css = readFileSync(join(root, 'src/styles.css'), 'utf8') + readFileSync(join(root, 'src/styles/ux-release.css'), 'utf8');

describe('apply-plan workflow', () => {
  it('lights Apply only when every manufacture card has recorded all batches', () => {
    assert.match(app, /function syncApplyPlanReadiness\(\)/);
    assert.match(app, /recipe-card\.manufacture/);
    assert.match(app, /progress-run/);
    assert.match(app, /ready-to-apply/);
    assert.match(app, /syncApplyPlanReadiness\(\)/);
  });

  it('resets the calculator after inventory application', () => {
    assert.match(app, /function resetCalculatorForNewPlan\(\)/);
    assert.match(app, /CALC_TRAY\s*=\s*\[\]/);
    assert.match(app, /calc-result/);
    assert.match(app, /calc-multi/);
    assert.match(app, /calc-item/);
    assert.match(app, /calc-qty/);
    assert.match(init, /resetCalculatorForNewPlan\(\)/);
    assert.doesNotMatch(init, /markPlanApplied\(planSignature\(item, qty\)\)[\s\S]*runCalculator\(\)/);
    assert.doesNotMatch(init, /markPlanApplied\(planSignature\(CALC_TRAY\)\)[\s\S]*runMultiPlan\(\)/);
  });

  it('explains where completed products and refinement leftovers are recorded', () => {
    assert.match(app, /Any unused batch surplus stays at the colony where it was produced/);
    assert.match(app, /refinement leftovers stay at the refinement colony/);
    assert.match(css, /\.apply-plan-note\s*\{/);
  });

  it('provides a visible reduced-motion-safe Apply readiness effect', () => {
    assert.match(css, /\.apply-plan\.ready-to-apply\s*\{/);
    assert.match(css, /@keyframes\s+apply-plan-ready/);
    assert.match(css, /prefers-reduced-motion:\s*reduce[\s\S]*\.apply-plan\.ready-to-apply/);
  });

  it('keeps the Settings slider inside its control grid', () => {
    assert.match(html, /class="size-control"/);
    assert.match(css, /\.settings-panel \.size-control input\[type="range"\]\s*\{[^}]*width:\s*100%[^}]*min-width:\s*0/s);
    assert.match(css, /\.settings-panel \.size-slider\s*\{[^}]*grid-template-columns:\s*auto minmax\(0, 1fr\)/s);
    assert.match(css, /\.settings-panel \.size-slider \.size-label\s*\{[^}]*grid-column:\s*2/s);
  });

  it('collapses completed colony work while keeping its heading reopenable', () => {
    assert.match(app, /function syncColonyWorkGroupStates\(root\)/);
    assert.match(app, /function toggleColonyWorkGroup\(/);
    assert.match(app, /colony-work-toggle/);
    assert.match(css, /\.colony-work-group\.complete:not\(\.expanded\) \.colony-work-list\s*\{[^}]*display:\s*none/s);
  });
});
