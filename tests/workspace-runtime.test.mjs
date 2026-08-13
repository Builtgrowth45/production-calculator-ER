// Runtime round-trip tests for the public workspace envelope.
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const root = join(import.meta.dirname, '..');
globalThis.window = { normalizeFactionId: v => String(v || 'UNAFFILIATED').toUpperCase() };
globalThis.localStorage = {
  _data: {},
  get length() { return Object.keys(this._data).length; },
  key(i) { return Object.keys(this._data)[i] || null; },
  getItem(k) { return this._data[k] ?? null; },
  setItem(k, v) { this._data[k] = String(v); },
};
globalThis.document = { getElementById() { return null; }, querySelectorAll() { return []; } };
require(join(root, 'src', 'store.js'));
const S = window.STORE;

beforeEach(() => { localStorage._data = {}; S.PLAYERS.active = ''; S.PLAYERS.players = {}; S.PLAYERS.profiles = {}; });

describe('workspace snapshot runtime', () => {
  it('round-trips player profiles, inventory, preferences, and colony state', () => {
    S.importPlayer('Chris', [{ item: 'coal', location: 'Andromeda', quantity: 84 }]);
    S.setPlayerFaction('Chris', 'CMG');
    localStorage.setItem('er_colony_world_v2', JSON.stringify({ schema_version: 2, owner: { Paris: 'CMG' }, tax: { Paris: 15 } }));
    localStorage.setItem('cmg_destination', JSON.stringify('Paris'));
    const snapshot = S.exportWorkspace();
    assert.equal(snapshot.type, 'empire-rising-workspace');
    assert.equal(snapshot.schema_version, 1);
    assert.ok(snapshot.storage.cmg_players_v1.includes('Chris'));
    assert.equal(snapshot.storage.cmg_destination, JSON.stringify('Paris'));

    localStorage._data = {};
    S.importWorkspace(snapshot);
    assert.equal(S.PLAYERS.active, 'Chris');
    assert.equal(S.getActiveFaction(), 'CMG');
    assert.deepEqual(S.getInv(), [{ item: 'coal', location: 'Andromeda', quantity: 84 }]);
    assert.equal(localStorage.getItem('er_colony_world_v2'), snapshot.storage.er_colony_world_v2);
  });

  it('rejects unsupported keys and malformed JSON before changing storage', () => {
    localStorage.setItem('cmg_destination', JSON.stringify('Berlin'));
    const before = { ...localStorage._data };
    assert.throws(() => S.importWorkspace({ type: 'empire-rising-workspace', schema_version: 1, storage: { secret_key: '"no"' } }), /Invalid workspace snapshot/);
    assert.deepEqual(localStorage._data, before);
    assert.throws(() => S.importWorkspace({ type: 'empire-rising-workspace', schema_version: 1, storage: { cmg_destination: 'not-json' } }), /Invalid workspace snapshot/);
    assert.deepEqual(localStorage._data, before);
  });
});
