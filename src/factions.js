// Canonical public faction registry. Generated from data/factions.json by the
// checked-in source generator below; this file is loaded before app-core.js.
(function (root) {
  'use strict';
  const source = {
    schema_version: 1,
    factions: [
      { id: 'UNAFFILIATED', name: 'Unaffiliated / Prefer not to say', aliases: ['CIVILIAN'], player_selectable: true, recipe_code: 'CIVILIAN', asset_code: 'Civilian', return_rate: null, return_rate_status: 'unknown' },
      { id: 'BOS', name: 'Brotherhood of Shadows', aliases: ['BoS'], player_selectable: true, recipe_code: 'BOS', asset_code: 'BOS', return_rate: null, return_rate_status: 'unknown' },
      { id: 'CMG', name: 'Colonization and Mining Guild', aliases: [], player_selectable: true, recipe_code: 'CMG', asset_code: 'CMG', return_rate: 0.85, return_rate_status: 'legacy-reviewed' },
      { id: 'EC', name: 'EuroCore', aliases: [], player_selectable: true, recipe_code: 'EC', asset_code: 'EC', return_rate: null, return_rate_status: 'unknown' },
      { id: 'FDC', name: 'Freedom Defense Corps.', aliases: [], player_selectable: true, recipe_code: 'FDC', asset_code: 'FDC', return_rate: null, return_rate_status: 'unknown' },
      { id: 'GOM', name: 'Guardians of Mankind', aliases: ['GoM'], player_selectable: true, recipe_code: 'GOM', asset_code: 'GOM', return_rate: null, return_rate_status: 'unknown' },
      { id: 'LED', name: 'Law Enforcement Department', aliases: [], player_selectable: true, recipe_code: 'LED', asset_code: 'LED', return_rate: null, return_rate_status: 'unknown' },
      { id: 'MOTB', name: 'Mercenaries of the Blood', aliases: ['MotB', 'MOB'], player_selectable: true, recipe_code: 'MOTB', asset_code: 'MOB', return_rate: null, return_rate_status: 'unknown' },
      { id: 'VI', name: 'Vortext, Inc.', aliases: ['VC', 'VTX', 'Vortex'], player_selectable: true, recipe_code: 'VI', asset_code: 'VTX', return_rate: null, return_rate_status: 'unknown' },
    ],
  };
  const byId = Object.fromEntries(source.factions.map(f => [f.id, Object.freeze({ ...f, aliases: Object.freeze([...f.aliases]) })]));
  const aliases = {};
  source.factions.forEach(f => [f.id, ...f.aliases].forEach(a => { aliases[String(a).toUpperCase()] = f.id; }));
  const registry = Object.freeze({
    schema_version: source.schema_version,
    factions: Object.freeze(source.factions.map(f => byId[f.id])),
    byId: Object.freeze(byId),
    aliases: Object.freeze(aliases),
    selectable: Object.freeze(source.factions.filter(f => f.player_selectable).map(f => byId[f.id])),
  });
  root.ER_FACTIONS = registry;
  root.normalizeFactionId = function (value) {
    const key = String(value == null ? '' : value).trim().toUpperCase();
    return registry.aliases[key] || 'UNAFFILIATED';
  };
  root.factionById = function (value) { return registry.byId[root.normalizeFactionId(value)] || registry.byId.UNAFFILIATED; };
})(typeof window !== 'undefined' ? window : globalThis);
