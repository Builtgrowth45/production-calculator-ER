// Public player/faction contract — deliberately RED before implementation.
// This gate turns the baseline's CMG coupling into executable requirements.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const read = file => readFileSync(join(root, file), 'utf8');
const appCore = read('src/app-core.js');
const app = read('src/app.js');
const store = read('src/store.js');
const player = read('src/views/player.js');
const gameData = read('src/game_data.js');

function loadFactionIds() {
  const match = gameData.match(/window\.GAME_DATA\s*=\s*([\s\S]*);\s*$/);
  assert.ok(match, 'generated game data should expose window.GAME_DATA');
  const data = Function(`return (${match[1]})`)();
  return [...new Set((data.recipes || []).map(r => r._faction).filter(Boolean))].sort();
}

describe('public player/faction contract', () => {
  it('has one canonical faction registry used by player and gallery code', () => {
    assert.match(read('data/factions.json'), /"id"\s*:\s*"UNAFFILIATED"/);
    assert.match(read('src/factions.js'), /FACTIONS|FACTION_REGISTRY/);
    assert.doesNotMatch(player, /const\s+FACTIONS\s*=|\bCMG_FACTION\b/);
  });

  it('persists an explicit faction or unaffiliated state for every player', () => {
    assert.ok(/schema_version|profiles|faction/.test(store), 'store lacks versioned faction metadata');
    assert.ok(/faction/i.test(player), 'player view lacks faction controls');
    assert.ok(/faction/i.test(read('index.html')), 'HTML shell lacks faction UI');
  });

  it('does not use fixed CMG ownership to determine public player returns', () => {
    assert.doesNotMatch(appCore, /const\s+CMG_HOLDINGS\s*=\s*\[/);
    assert.doesNotMatch(app, /CMG owns/);
    assert.doesNotMatch(read('src/engine.js'), /CMG_FACTION|FACTION_REBATE/);
  });

  it('keeps player spend separate from faction return/net cost', () => {
    assert.match(appCore, /playerSpend|gross|factionReturn|netFactionCost|net.*cost/i);
    assert.match(appCore, /faction return|Faction return|player spend|Player spend/i);
  });

  it('represents every recipe faction and has a safe unaffiliated mode', () => {
    const ids = loadFactionIds();
    const registry = read('data/factions.json');
    for (const id of ids) assert.match(registry, new RegExp(`"(?:id|recipe_code)"\\s*:\\s*"${id}"`), `missing registry entry for ${id}`);
    assert.match(registry, /"id"\s*:\s*"UNAFFILIATED"/);
  });

  it('does not invent CMG holdings for a fresh public profile', () => {
    assert.doesNotMatch(appCore, /CMG_HOLDINGS/);
    assert.doesNotMatch(appCore, /Paris.*Andromeda|Andromeda.*Paris/);
  });
});
