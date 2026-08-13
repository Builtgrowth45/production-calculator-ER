// tests/item-model-link.test.mjs — contextual preview contract
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const engine = readFileSync(join(root, 'src', 'engine.js'), 'utf8');
const loader = readFileSync(join(root, 'src', 'ui', 'r3f-loader.js'), 'utf8');

describe('contextual item model inspection', () => {
  it('looks up the manifest only from an explicit item-detail action', () => {
    assert.match(engine, /data-ip-model/);
    assert.match(engine, /loadCMGModelManifest/);
    assert.match(engine, /models\.find/);
    assert.match(engine, /mountCMGPreview/);
  });

  it('does not preload the R3F bundle or models for normal item details', () => {
    assert.doesNotMatch(engine, /cmgLoadR3F\(\)/);
    assert.match(loader, /if \(!window\.CMG_FEATURE_FLAGS\?\.r3f_v1\)/);
  });
});
