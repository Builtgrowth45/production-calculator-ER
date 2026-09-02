#!/usr/bin/env node
/**
 * scripts/build-character-parts.mjs — index the head, hair, hands and skin-tone
 * textures the Character Studio can put on a body.
 *
 * The clothing manifest (models/character_skins.json) only covers Torso and
 * Legs; its "Head" group has always been empty, so faces and hair were not
 * selectable. The textures themselves have been in the tree all along, under
 * textures_extracted/, named <gender>_<Part><shape>_<variant>.png.
 *
 * `shape` is geometry, not paint: Face2 and Hair8 are different meshes with
 * different UV layouts, so a texture is only safe on the mesh of its own
 * shape. This index therefore groups by shape and the studio offers a shape
 * only when the loaded body actually contains that mesh — which is why adding
 * more head or hair meshes later needs no code change here or in the view.
 *
 *   node scripts/build-character-parts.mjs           # write the index
 *   node scripts/build-character-parts.mjs --check   # fail if it is stale
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'models', 'character_parts.json');
// The ER Ops Console is deployed straight from its own folder and reads this
// index to build its face and hair pickers. It kept its own copy so a CDN
// miss cannot silently collapse those pickers to the bundled maps.
const mirrors = [path.join(root, 'er-ops-console', 'models', 'character_parts.json')];

// Where each part's textures live, and how to label them for a player.
const SOURCES = [
  { part: 'Face', dir: 'textures_extracted/Characters/Head', label: 'Face' },
  { part: 'Hair', dir: 'textures_extracted/Characters/Head', label: 'Hair' },
  { part: 'Hands', dir: 'textures_extracted/Characters/General', label: 'Skin tone' },
];

const NAME = /^([fm])_(Face|Hair|Hands)(\d+)_([A-Za-z0-9]+)\.png$/;

function collect() {
  const parts = { f: {}, m: {} };
  for (const { part, dir } of SOURCES) {
    const absolute = path.join(root, dir);
    if (!fs.existsSync(absolute)) continue;
    for (const name of fs.readdirSync(absolute).sort()) {
      const match = NAME.exec(name);
      if (!match || match[2] !== part) continue;
      const [, gender, , shape, variant] = match;
      const byPart = (parts[gender][part] ||= {});
      (byPart[shape] ||= []).push({
        file: `${dir}/${name}`,
        variant,
        // Numeric variants are client indices and mean nothing to a player;
        // named ones (Black, White) are the label already.
        label: /^\d+$/.test(variant) ? `${part} ${shape}·${variant}` : variant,
      });
    }
  }
  return parts;
}

function build() {
  return {
    generated: new Date().toISOString().slice(0, 10),
    source: 'client textures_extracted/ head, hair and skin-tone maps',
    note: 'shape keys are mesh names; a texture only fits the mesh of its own shape',
    parts: collect(),
  };
}

const manifest = build();
const text = `${JSON.stringify(manifest, null, 1)}\n`;

const targets = [out, ...mirrors];

if (process.argv.includes('--check')) {
  const stale = targets.filter(file => !fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text);
  if (stale.length) {
    console.error('[build-character-parts] stale:');
    for (const file of stale) console.error(`  ${path.relative(root, file)}`);
    console.error('Run `npm run parts:manifest` to regenerate.');
    process.exit(1);
  }
  console.log(`[build-character-parts] character part index in sync (${targets.length} copies)`);
} else {
  for (const file of targets) fs.writeFileSync(file, text);
  const counts = Object.entries(manifest.parts).map(([g, p]) =>
    `${g}: ${Object.entries(p).map(([k, v]) => `${k}×${Object.keys(v).length} shapes`).join(', ')}`);
  console.log(`[build-character-parts] wrote ${out.replace(`${root}/`, '')}\n  ${counts.join('\n  ')}`);
}
