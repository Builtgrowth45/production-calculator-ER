// Runtime tests for neutral colony world snapshot helpers.
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const root = join(import.meta.dirname, '..');
globalThis.window = {
  ER_FACTIONS: { selectable: [{ id: 'UNAFFILIATED' }, { id: 'CMG' }, { id: 'EC' }] },
  factionById(id) { return this.ER_FACTIONS.selectable.find(f => f.id === id); },
  ENGINE: {},
};
globalThis.localStorage = { data: {}, getItem(k) { return this.data[k] ?? null; }, setItem(k, v) { this.data[k] = String(v); } };
globalThis.document = { getElementById() { return null; }, documentElement: { dataset: {}, style: {} }, querySelectorAll() { return []; } };
require(join(root, 'src', 'store.js'));
// Exercise the classic app-core in a minimal VM-like global context.
const fs = (await import('node:fs')).readFileSync;
const vm = (await import('node:vm')).default;
globalThis.window.GAME_DATA = { mining_sites: [], inventory: [] };
globalThis.window.ENGINE = {
  DESTINATION: 'Berlin', esc: x => String(x), fmt: x => String(x), displayName: x => x,
  iconFor: () => '', RECIPES_BY_OUTPUT: {}, ALL_ITEMS: new Set(), CATEGORIES: {},
};
globalThis.DATA = window.GAME_DATA;
globalThis.S = { getActiveFaction: () => 'UNAFFILIATED' };
vm.runInThisContext(fs(join(root, 'src', 'app-core.js'), 'utf8'), { filename: 'app-core-world-test.js' });

beforeEach(() => { localStorage.data = {}; resetColonyWorld(); });

describe('colony world snapshots', () => {
  it('exports an explicit versioned local snapshot', () => {
    importColonyWorld({ schema_version: 2, type: 'empire-rising-colony-world', owner: { Paris: 'EC' }, tax: { Paris: 15 } });
    assert.deepEqual(exportColonyWorld(), {
      schema_version: 2,
      defaults_initialized: true,
      type: 'empire-rising-colony-world',
      owner: { Paris: ['EC'] },
      tax: { Paris: 15 },
      exported_at: exportColonyWorld().exported_at,
    });
  });

  it('normalizes valid owners and drops invalid owners without mutating tax', () => {
    const result = importColonyWorld({ schema_version: 2, type: 'empire-rising-colony-world', owner: { Paris: 'ec', Tokyo: 'invalid' }, tax: { Paris: 20, Tokyo: 35 } });
    assert.deepEqual(result.owner, { Paris: ['EC'] });
    assert.deepEqual(result.tax, { Paris: 20, Tokyo: 35 });
  });

  it('rejects malformed snapshots before mutating current state', () => {
    importColonyWorld({ schema_version: 2, type: 'empire-rising-colony-world', owner: { Paris: 'EC' }, tax: { Paris: 20 } });
    assert.throws(() => importColonyWorld({ owner: { Tokyo: 'CMG' } }), /Invalid colony world snapshot/);
    assert.deepEqual(exportColonyWorld().owner, { Paris: ['EC'] });
    assert.deepEqual(exportColonyWorld().tax, { Paris: 20 });
  });

  it('reset clears owners and taxes and persists the neutral state', () => {
    importColonyWorld({ schema_version: 2, type: 'empire-rising-colony-world', owner: { Paris: 'CMG' }, tax: { Paris: 25 } });
    resetColonyWorld();
    assert.deepEqual(exportColonyWorld().owner, {
      Brooklyn: ['LED', 'FDC'],
      'Ground Zero': ['LED', 'FDC'],
      'Training Grounds': ['LED', 'FDC'],
      "DeMorgan's Castle": ['LED', 'FDC'],
      'DSS Yukon': ['FDC'],
      'Pax Prime': ['EC'],
      'Pegasi 51': ['EC'],
      "Kepler's Dome": ['EC'],
      'Titan Station': ['EC'],
      'NYC Manhattan': ['GOM'],
      Aurelia: ['GOM'],
      "Necar's Field": ['BOS'],
      Berlin: ['BOS'],
      Paris: ['CMG'],
      'Andromeda City': ['CMG'],
      'Ceres Delta': ['VI'],
      Tokyo: ['VI'],
    });
    assert.deepEqual(exportColonyWorld().tax, {});
    assert.deepEqual(JSON.parse(localStorage.getItem('er_colony_world_v2')).owner, exportColonyWorld().owner);
  });
});
