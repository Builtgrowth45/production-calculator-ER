// Canonical faction registry tests.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const registry = JSON.parse(readFileSync(join(root, 'data/factions.json'), 'utf8'));
const gameData = readFileSync(join(root, 'src/game_data.js'), 'utf8');
const recipeCodes = [...new Set([...gameData.matchAll(/"_faction"\s*:\s*"([^"]+)"/g)].map(m => m[1]))];

describe('canonical public faction registry', () => {
  it('has unique selectable IDs and aliases', () => {
    const ids = registry.factions.map(f => f.id);
    assert.equal(new Set(ids).size, ids.length);
    const aliases = registry.factions.flatMap(f => f.aliases.map(a => a.toUpperCase()));
    assert.equal(new Set(aliases).size, aliases.length);
    assert.ok(registry.factions.every(f => f.player_selectable));
  });

  it('resolves every recipe faction code explicitly', () => {
    const resolved = new Set(registry.factions.map(f => f.recipe_code).filter(Boolean));
    for (const code of recipeCodes) assert.ok(resolved.has(code), `recipe faction ${code} is not classified`);
  });

  it('has explicit safe policy metadata', () => {
    assert.equal(registry.schema_version, 1);
    const unaffiliated = registry.factions.find(f => f.id === 'UNAFFILIATED');
    assert.equal(unaffiliated.return_rate, null);
    assert.equal(unaffiliated.return_rate_status, 'unknown');
    const cmg = registry.factions.find(f => f.id === 'CMG');
    assert.equal(cmg.return_rate, 0.85);
    assert.equal(cmg.return_rate_status, 'legacy-reviewed');
    for (const faction of registry.factions.filter(f => f.id !== 'CMG')) {
      assert.notEqual(faction.return_rate, 0.85, `${faction.id} must not inherit CMG's return`);
    }
  });

  it('uses the authoritative current faction names', () => {
    const names = Object.fromEntries(registry.factions.map(f => [f.id, f.name]));
    assert.equal(names.LED, 'Law Enforcement Department');
    assert.equal(names.FDC, 'Freedom Defense Corps.');
    assert.equal(names.GOM, 'Guardians of Mankind');
    assert.equal(names.BOS, 'Brotherhood of Shadows');
    assert.equal(names.MOTB, 'Mercenaries of the Blood');
    assert.equal(names.CMG, 'Colonization and Mining Guild');
    assert.equal(names.EC, 'EuroCore');
    assert.equal(names.VI, 'Vortex, Inc.');
  });
});
