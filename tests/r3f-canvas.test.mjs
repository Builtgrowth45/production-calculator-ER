// tests/r3f-canvas.test.mjs — shared demand-rendered scene contract
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const entry = readFileSync(join(root, 'src', '3d', 'entry.jsx'), 'utf8');
const models = readFileSync(join(root, 'src', 'views', 'models.js'), 'utf8');

describe('shared R3F canvas', () => {
  it('uses exactly one demand-rendered Canvas with bounded DPR', () => {
    assert.equal((entry.match(/<Canvas\b/g) || []).length, 1);
    assert.match(entry, /frameloop="demand"/);
    assert.match(entry, /dpr=\{\[1, 1\.75\]\}/);
    assert.match(entry, /setPixelRatio\(Math\.min\(window\.devicePixelRatio/);
    assert.doesNotMatch(entry, /requestAnimationFrame/);
  });

  it('owns one root/context and releases it before another mount', () => {
    assert.match(entry, /let root = null/);
    assert.match(entry, /root && container !== target/);
    assert.match(entry, /root\?\.unmount\(\)/);
  });

  it('keeps model resources explicit and never preloads the gallery', () => {
    assert.doesNotMatch(entry, /useGLTF\.preload/);
    assert.match(entry, /entry\?\.file/);
  });
});
