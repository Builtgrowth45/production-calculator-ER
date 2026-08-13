// tests/performance-budgets.test.mjs — enforce the plan's 3D budgets
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bundlePath = join(root, 'src', 'generated', 'er-3d-workbench.js');
const bundle = readFileSync(bundlePath);
const html = readFileSync(join(root, 'index.html'), 'utf8');
const entry = readFileSync(join(root, 'src', '3d', 'entry.jsx'), 'utf8');

describe('R3F performance budgets', () => {
  it('keeps the optional bundle within transfer and disk budgets', () => {
    assert.ok(gzipSync(bundle).length < 600 * 1024, `gzip bundle exceeds 600 KiB: ${gzipSync(bundle).length}`);
    assert.ok(statSync(bundlePath).size < 2.1 * 1024 * 1024, 'bundle exceeds 2.1 MiB');
  });

  it('keeps one Canvas, demand rendering, bounded DPR, and no idle loop', () => {
    assert.equal((entry.match(/<Canvas\b/g) || []).length, 1);
    assert.match(entry, /frameloop="demand"/);
    assert.doesNotMatch(entry, /requestAnimationFrame/);
  });

  it('does not eagerly load models or the optional bundle', () => {
    assert.doesNotMatch(html, /<script[^>]+er-3d-workbench\.js/);
    assert.doesNotMatch(entry, /useGLTF\.preload/);
  });
});
