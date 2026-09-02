// tests/model-manifest.test.mjs — the 3D gallery manifest must describe the
// GLBs that are actually on disk. It drifted once already: every entry's
// `bytes` was left behind when the handedness fixer rewrote the models, and
// four weapon variants were never listed at all.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modelsDir = path.join(root, 'models');
const manifestPaths = [
  path.join(modelsDir, 'models_manifest.json'),
  path.join(root, 'er-ops-console', 'models', 'models_manifest.json'),
];
const manifest = JSON.parse(fs.readFileSync(manifestPaths[0], 'utf8'));

// Mirrors the generator's exclusion list: engine scaffolding and the
// character-builder composites are on disk but are not gallery models.
const EXCLUDED = new Set([
  '1x1_square.glb', 'clouds.glb', 'default.glb', 'skybox.glb', 'sphere.glb',
  'Characters/f_Average_Studio.glb', 'Characters/m_Average_Studio.glb',
]);

function glbFilesOnDisk(dir = modelsDir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...glbFilesOnDisk(full));
    else if (entry.name.endsWith('.glb')) out.push(path.relative(modelsDir, full).replaceAll(path.sep, '/'));
  }
  return out;
}

describe('3D model manifest', () => {
  it('lists every shipped GLB exactly once, and nothing that is gone', () => {
    const listed = manifest.models.map((entry) => entry.file);
    assert.equal(new Set(listed).size, listed.length, 'manifest contains duplicate files');
    const expected = glbFilesOnDisk().filter((file) => !EXCLUDED.has(file)).sort();
    assert.deepEqual([...listed].sort(), expected);
  });

  it('records the size on disk, so the gallery never quotes a stale weight', () => {
    for (const entry of manifest.models) {
      const size = fs.statSync(path.join(modelsDir, entry.file)).size;
      assert.equal(entry.bytes, size, `${entry.file} is ${size} bytes, manifest says ${entry.bytes}`);
    }
  });

  it('records the texture sidecar each model actually has', () => {
    for (const entry of manifest.models) {
      const sidecar = path.join(modelsDir, `${entry.file.slice(0, -4)}.texinfo.json`);
      const textures = fs.existsSync(sidecar)
        ? JSON.parse(fs.readFileSync(sidecar, 'utf8')).textures || []
        : [];
      assert.deepEqual(entry.textures || [], textures, `${entry.file} texture list`);
      assert.equal(entry.textured, textures.length > 0, `${entry.file} textured flag`);
    }
  });

  it('gives every entry the fields the gallery renders', () => {
    for (const entry of manifest.models) {
      assert.ok(entry.name, `${entry.file} has no display name`);
      assert.equal(entry.category, entry.file.split('/')[0], `${entry.file} category`);
      assert.equal(entry.dims?.length, 3, `${entry.file} dims`);
      assert.ok(entry.nodes > 0, `${entry.file} node count`);
      assert.ok(entry.lods > 0, `${entry.file} lod count`);
    }
  });

  it('keeps the ER Ops Console copy byte-identical to the root manifest', () => {
    const [source, ...mirrors] = manifestPaths.map((file) => fs.readFileSync(file, 'utf8'));
    for (const [index, mirror] of mirrors.entries()) {
      assert.equal(mirror, source, `${manifestPaths[index + 1]} has drifted`);
    }
  });
});
