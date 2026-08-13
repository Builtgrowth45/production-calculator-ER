// tests/r3f-integration.test.mjs — remaining 3D integration contracts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const loader = readFileSync(join(root, 'src', 'ui', 'r3f-loader.js'), 'utf8');
const legacy = readFileSync(join(root, 'src', 'ui', 'legacy-3d-loader.js'), 'utf8');
const spatial = readFileSync(join(root, 'src', 'ui', 'spatial-emphasis.js'), 'utf8');
const models = readFileSync(join(root, 'src', 'views', 'models.js'), 'utf8');

describe('progressive R3F integration', () => {
  it('ports Character Studio through the shared outfit API', () => {
    assert.match(readFileSync(join(root, 'src', '3d', 'entry.jsx'), 'utf8'), /OutfitScene/);
    assert.match(readFileSync(join(root, 'src', 'views', 'character.js'), 'utf8'), /syncR3FStudio/);
  });

  it('provides explicit item/gear preview mounting without enabling R3F by default', () => {
    assert.match(loader, /mountCMGPreview/);
    assert.match(html, /data-cmg-r3f-v1="off"/);
    assert.match(html, /data-cmg-3d-preview/);
  });

  it('loads legacy Three.js only after explicit legacy model/studio intent', () => {
    assert.doesNotMatch(html, /<script src="src\/vendor\/three\/three\.min\.js/);
    assert.match(html, /src="src\/ui\/legacy-3d-loader\.js\?v=1"/);
    assert.match(legacy, /scripts = \[/);
    assert.match(models, /cmgLoadLegacy3D\(\)/);
  });

  it('keeps spatial emphasis accessible and non-animated under reduced motion', () => {
    assert.match(spatial, /setCMGSpatialEmphasis/);
    assert.match(html, /src="src\/ui\/spatial-emphasis\.js\?v=1"/);
    assert.match(readFileSync(join(root, 'src', 'styles', 'components.css'), 'utf8'), /prefers-reduced-motion: reduce/);
  });
});
