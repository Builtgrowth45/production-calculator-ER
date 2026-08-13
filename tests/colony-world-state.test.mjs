// Colony world-state contract: ownership is explicit, neutral, and portable.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const core = readFileSync(join(root, 'src/app-core.js'), 'utf8');
const app = readFileSync(join(root, 'src/app.js'), 'utf8');
const styles = readFileSync(join(root, 'src/styles.css'), 'utf8');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const registry = JSON.parse(readFileSync(join(root, 'data/factions.json'), 'utf8'));

describe('neutral colony world state', () => {
  it('uses a versioned neutral storage key and reads legacy state without seeding holdings', () => {
    assert.match(core, /er_colony_world_v2/);
    assert.match(core, /cmg_colony_tax_v1/);
    assert.doesNotMatch(core, /CMG_HOLDINGS/);
    assert.doesNotMatch(core, /COLONY_OWNER\[.*Paris|COLONY_OWNER\[.*Andromeda/);
  });

  it('offers unknown owner plus every selectable faction', () => {
    assert.match(app, /window\.ER_FACTIONS\?\.selectable/);
    assert.match(app, /Owner not set/);
  });

  it('constrains the owner picker to its colony card at every grid width', () => {
    assert.match(styles, /\.cc-own\s*\{[^}]*width:\s*100%[^}]*min-width:\s*0/s);
    assert.match(styles, /\.cc-own select\s*\{[^}]*width:\s*100%[^}]*max-width:\s*100%/s);
  });

  it('keeps owner changes separate from tax changes', () => {
    assert.match(app, /COLONY_OWNER\[c\] = owner/);
    assert.doesNotMatch(app, /COLONY_TAX\[c\] = 0/);
    assert.match(app, /data-ct-tax/);
    assert.match(app, /data-ct-own/);
  });

  it('labels local world state and provides portability controls', () => {
    assert.match(html, /stored locally|local snapshot|local world/i);
    assert.match(html, /colony-world-export|Export.*colony|Export.*world/i);
    assert.match(html, /colony-world-import|Import.*colony|Import.*world/i);
    assert.match(html, /colony-world-reset|Reset.*colony|Reset.*world/i);
  });
});
