// tests/offline-deployment.test.mjs — shell/cache/deployment contract
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sw = readFileSync(join(root, 'sw.js'), 'utf8');
const html = readFileSync(join(root, 'index.html'), 'utf8');

describe('offline and deployment verification', () => {
  it('precaches the ER bridge and staged loader assets without model files', () => {
    assert.match(sw, /const CACHE = 'er-v0\.1\.0'/);
    assert.match(sw, /'\.\/src\/generated\/er-3d-workbench\.js'/);
    for (const path of ['./src/ui/motion.js', './src/ui/value-transition.js', './src/ui/r3f-loader.js', './src/ui/legacy-3d-loader.js', './src/generated/er-3d-workbench.js']) {
      assert.match(sw, new RegExp(path.replaceAll('.', '\\.') ));
    }
    assert.doesNotMatch(sw, /models\/.*\.glb/);
  });

  it('keeps the page entry references versioned and the generated bundle lazy', () => {
    assert.doesNotMatch(html, /src="src\/generated\/er-3d-workbench\.js\?v=1"/);
    assert.match(html, /src="src\/ui\/r3f-loader\.js\?v=1"/);
  });
});
