// tests/gear-save-set.test.mjs — save button regression coverage
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const appInit = readFileSync(join(root, 'src', 'app-init.js'), 'utf8');
const appCore = readFileSync(join(root, 'src', 'app-core.js'), 'utf8');
const saveStart = appInit.indexOf("document.getElementById('gear-save-set')");
const saveEnd = appInit.indexOf("document.getElementById('gear-clear')", saveStart);
const saveHandler = appInit.slice(saveStart, saveEnd);

describe('gear set saving', () => {
  it('uses the declared local ID helper for every gear-set creation path', () => {
    assert.match(saveHandler, /const set = \{ id: localId\(\), name: n/);
    assert.doesNotMatch(appInit, /reqId\(\)/);
    assert.doesNotMatch(appCore, /reqId\(\)/);
  });
});
