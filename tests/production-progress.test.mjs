// tests/production-progress.test.mjs — player-facing batch progress tracking
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const siteDir = join(fileURLToPath(new URL('..', import.meta.url)));
const appSrc = readFileSync(join(siteDir, 'src', 'app.js'), 'utf8');
const coreSrc = readFileSync(join(siteDir, 'src', 'app-core.js'), 'utf8');
const initSrc = readFileSync(join(siteDir, 'src', 'app-init.js'), 'utf8');
const stylesSrc = readFileSync(join(siteDir, 'src', 'styles.css'), 'utf8');

function extractFunction(name) {
  const match = appSrc.match(new RegExp(
    `function ${name}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n\\}`
  ));
  assert.ok(match, `expected ${name} in src/app.js`);
  return match[0];
}

const nextProductionProgress = vm.runInNewContext(`(${extractFunction('nextProductionProgress')})`);

describe('production batch progress tracker', () => {
  it('records 100, 100, 100, then the final 60 for a 360-batch step', () => {
    let completed = 0;
    const remaining = [];
    for (let i = 0; i < 4; i += 1) {
      const state = nextProductionProgress(completed, 360, 100);
      completed = state.completed;
      remaining.push(state.remaining);
    }

    assert.deepEqual(remaining, [260, 160, 60, 0]);
    assert.equal(completed, 360);
  });

  it('never advances past the planned batch total', () => {
    const state = nextProductionProgress(350, 360, 100);
    assert.equal(state.completed, 360);
    assert.equal(state.remaining, 0);
    assert.equal(state.advanced, 10);
  });

  it('checks the production box and exposes a compact completed step', () => {
    assert.match(appSrc, /checkbox\.checked = true/);
    assert.match(appSrc, /toggleProduceCheck\(checkbox\)/);
    assert.match(appSrc, /progress-complete/);
    assert.match(coreSrc, /progress-complete/);
  });

  it('compacts completed mining and moving rows without removing their item chip', () => {
    assert.match(appSrc, /flow-card move' \+ \(done \? ' done' : ''\)/);
    assert.match(appSrc, /flow-card get' \+ \(done \? ' done' : ''\)/);
    assert.match(stylesSrc, /\.flow-card\.move\.done[^}]*\.split-note/);
    assert.match(stylesSrc, /\.flow-card\.get\.done[^}]*\.flow-need/);
    assert.match(stylesSrc, /\.flow-card\.done \.flow-chip/);
  });

  it('adds mining batch progress with a clamped final haul and reset control', () => {
    assert.match(appSrc, /cmg_mining_progress_v1/);
    assert.match(appSrc, /MINING_PROGRESS/);
    assert.match(appSrc, /data-mine-total=/);
    assert.match(appSrc, /nextProductionProgress\(miningProgressFor\(item, target\), target, requested\)/);
    assert.match(appSrc, /resetMiningProgress/);
    assert.match(appSrc, /mine-progress/);
    assert.match(initSrc, /mine-progress-reset/);
  });

  it('resets checklist and batch progress on an explicit fresh calculation', () => {
    assert.match(appSrc, /function resetChecklistForCalculation\(\)/);
    assert.match(appSrc, /function runCalculator\(\)[\s\S]*resetChecklistForCalculation\(\)/);
    assert.match(appSrc, /function runMultiPlan\(options\)[\s\S]*resetChecklistForCalculation\(\)/);
    assert.match(appSrc, /runCalculator\(\{ preserveChecklist: true \}\)/);
    assert.match(appSrc, /runMultiPlan\(\{ preserveChecklist: true \}\)/);
  });

  it('adds a record-batch action directly to mineable Obtain-step rows', () => {
    assert.match(appSrc, /function renderAcquireSection\(plan\)[\s\S]*Record batch/);
    assert.match(appSrc, /data-mine-total=/);
    assert.match(appSrc, /mine-log obtain-batch/);
    assert.match(initSrc, /closest\('\.mine-log'\)/);
  });

  it('renders controls and wires them for both single and combined plans', () => {
    assert.match(coreSrc, /production-progress/);
    assert.match(coreSrc, /data-progress-item=/);
    assert.match(coreSrc, /data-progress-run/);
    assert.match(initSrc, /progress-run/);
    assert.match(initSrc, /progress-reset/);
  });
});
