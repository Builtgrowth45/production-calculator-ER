// tests/combined-path-picker.test.mjs — refinement controls in combined plans
// Regression guard: the multi-item renderer must provide the same path-picker
// mount point as the single-item renderer before renderCalcPaths() runs.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDir = join(fileURLToPath(new URL('..', import.meta.url)));
const appSrc = readFileSync(join(siteDir, 'src', 'app.js'), 'utf8');

function functionSlice(name, endMarker) {
  const start = appSrc.indexOf(`function ${name}`);
  const end = appSrc.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `could not isolate ${name}`);
  return appSrc.slice(start, end);
}

describe('combined-plan refinement path picker', () => {
  it('mounts the shared path-picker container before rendering combined results', () => {
    const single = functionSlice('renderPlan', 'function runCalculator');
    const multi = functionSlice('runMultiPlan', '// ── Saved production plans');
    const marker = '<div id="calc-paths" class="calc-paths" hidden></div>';

    assert.match(single, new RegExp(marker.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')),
      'single-item plans should keep the path-picker mount point');
    assert.match(multi, new RegExp(marker.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')),
      'combined plans must provide the path-picker mount point');
    assert.match(multi, /renderCalcPaths\(\);/,
      'combined plans should render the path controls after inserting the mount point');
  });
});
