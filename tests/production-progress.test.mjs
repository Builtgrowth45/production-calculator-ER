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

  it('renders controls and wires them for both single and combined plans', () => {
    assert.match(coreSrc, /production-progress/);
    assert.match(coreSrc, /data-progress-item=/);
    assert.match(coreSrc, /data-progress-run/);
    assert.match(initSrc, /progress-run/);
    assert.match(initSrc, /progress-reset/);
  });
});
