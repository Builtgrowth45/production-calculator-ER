// Workspace portability contract — RED before implementation.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const store = readFileSync(join(root, 'src', 'store.js'), 'utf8');
const player = readFileSync(join(root, 'src', 'views', 'player.js'), 'utf8');
const init = readFileSync(join(root, 'src', 'app-init.js'), 'utf8');

describe('portable public workspace', () => {
  it('defines a versioned workspace envelope and validates before mutation', () => {
    assert.match(store, /empire-rising-workspace/);
    assert.match(store, /WORKSPACE_SCHEMA_VERSION/);
    assert.match(store, /Invalid workspace snapshot/);
    assert.match(store, /validate.*workspace|workspace.*validate/i);
  });

  it('includes player, local settings, and all public local-storage namespaces', () => {
    assert.match(store, /players/);
    assert.match(store, /localStorage/);
    assert.match(store, /cmg_|er_/);
  });

  it('exposes workspace export/import controls in the public shell', () => {
    assert.match(init, /workspace-export|Export workspace/i);
    assert.match(init, /workspace-import|Import workspace/i);
    assert.match(init, /S\.exportWorkspace|S\.importWorkspace/);
  });

  it('preserves legacy inventory-only imports', () => {
    assert.match(player, /Array\.isArray\(obj\).*obj\.inventory|obj\.inventory/);
  });
});
