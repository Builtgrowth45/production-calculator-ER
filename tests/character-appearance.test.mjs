// tests/character-appearance.test.mjs — face, hair and skin-tone selection in
// the Character Studio.
//
// The invariant worth protecting: a head texture belongs to one mesh's UV
// layout. `Face2` and `Hair8` are different meshes, not different paint, so a
// shape may only be offered when the loaded body actually contains that mesh.
// Offering all 13 hair textures against the single Hair1 mesh would render
// garbage, so the view derives its options from the body it loaded.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const parts = JSON.parse(read('models/character_parts.json'));
const view = read('src/views/character.js');
const html = read('index.html');

function bodyMeshNames(relPath) {
  const bytes = fs.readFileSync(path.join(root, relPath));
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8'));
  return (json.nodes || []).map((node) => node.name || '');
}

const BODIES = { f: 'models/Characters/f_Average_Studio.glb', m: 'models/Characters/m_Average_Studio.glb' };

describe('character studio appearance', () => {
  it('indexes every head, hair and skin-tone texture in the tree', () => {
    const onDisk = { Face: 0, Hair: 0, Hands: 0 };
    for (const dir of ['textures_extracted/Characters/Head', 'textures_extracted/Characters/General']) {
      for (const name of fs.readdirSync(path.join(root, dir))) {
        const match = /^[fm]_(Face|Hair|Hands)\d+_[A-Za-z0-9]+\.png$/.exec(name);
        if (match) onDisk[match[1]] += 1;
      }
    }
    const indexed = { Face: 0, Hair: 0, Hands: 0 };
    for (const byPart of Object.values(parts.parts)) {
      for (const [part, shapes] of Object.entries(byPart)) {
        for (const variants of Object.values(shapes)) indexed[part] += variants.length;
      }
    }
    assert.deepEqual(indexed, onDisk);
  });

  it('points every indexed variant at a file that exists', () => {
    for (const byPart of Object.values(parts.parts)) {
      for (const shapes of Object.values(byPart)) {
        for (const variants of Object.values(shapes)) {
          for (const variant of variants) {
            assert.ok(fs.existsSync(path.join(root, variant.file)), `${variant.file} is missing`);
            assert.ok(variant.label, `${variant.file} has no label`);
          }
        }
      }
    }
  });

  it('has variants for the face, hair and hands shapes each body actually ships', () => {
    for (const [gender, body] of Object.entries(BODIES)) {
      const shapes = bodyMeshNames(body)
        .map((name) => /^(Face|Hair|Hands)(\d+)$/.exec(name))
        .filter(Boolean);
      assert.ok(shapes.length, `${body} exposes no appearance meshes`);
      for (const [, part, shape] of shapes) {
        // Hands2 is the glove mesh; its maps are faction gear, not skin tone.
        if (part === 'Hands') continue;
        const variants = parts.parts[gender]?.[part]?.[shape];
        assert.ok(variants?.length, `${gender} body wears ${part}${shape} with no indexed variants`);
      }
    }
  });

  it('offers a shape only when the loaded body carries that mesh', () => {
    // The lookup is keyed by the mesh's own shape, never by the whole part.
    assert.match(view, /studioAppearance\[part\]/);
    assert.match(view, /byGender\[part\]\[slot\.shape\]/);
    assert.match(view, /if \(wrap\) wrap\.hidden = options\.length === 0;/);
  });

  it('wires a control for each appearance part', () => {
    for (const id of ['studio-face', 'studio-hair', 'studio-hands']) {
      assert.match(html, new RegExp(`<select id="${id}">`), `${id} select missing`);
      assert.match(html, new RegExp(`id="${id}-row" hidden`), `${id} row should start hidden`);
    }
    assert.match(view, /STUDIO_APPEARANCE_PARTS = \['Face', 'Hair', 'Hands'\]/);
    assert.match(view, /applyStudioPart\(part, e\.target\.value\)/);
  });

  it('loads the part index without breaking the studio when it is absent', () => {
    assert.match(view, /fetch\('models\/character_parts\.json'\)/);
    assert.match(view, /\.catch\(function \(\) \{ studioParts = null; \}\)/);
  });
});
