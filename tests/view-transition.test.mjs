// tests/view-transition.test.mjs — staged view transition contract
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const core = readFileSync(join(root, 'src', 'app-core.js'), 'utf8');
const motion = readFileSync(join(root, 'src', 'ui', 'motion.js'), 'utf8');
const shell = readFileSync(join(root, 'src', 'styles', 'shell.css'), 'utf8');
const html = readFileSync(join(root, 'index.html'), 'utf8');

describe('accessible view transitions', () => {
  it('loads the motion adapter before app-core and keeps it opt-in', () => {
    assert.match(html, /src\/ui\/motion\.js\?v=\d+/);
    assert.ok(html.indexOf('src/ui/motion.js') < html.indexOf('src/app-core.js'));
    assert.match(core, /CMG_FEATURE_FLAGS\?\.motion_v2/);
    assert.match(core, /runCMGViewTransition\(applyView, \{ from, to \}\)/);
  });

  it('provides native, fallback, and reduced-motion paths', () => {
    assert.match(motion, /document\.startViewTransition/);
    assert.match(motion, /prefers-reduced-motion/);
    assert.match(motion, /cmg-view-leaving/);
    assert.match(motion, /requestAnimationFrame/);
  });

  it('keeps view hooks and analytics inside the atomic update callback', () => {
    const applyStart = core.indexOf('const applyView = () =>');
    const applyEnd = core.indexOf('};', applyStart);
    const apply = core.slice(applyStart, applyEnd);
    assert.match(apply, /ANALYTICS\.track\('pageview'/);
    assert.match(apply, /VIEW_HOOKS\.forEach/);
    assert.match(apply, /setView\._prev = v/);
  });

  it('disables fallback and native transition animation under reduced motion', () => {
    assert.match(shell, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(shell, /cmg-view-entering/);
    assert.match(shell, /animation: none/);
  });
});
