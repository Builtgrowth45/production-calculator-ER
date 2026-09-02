#!/usr/bin/env node
/**
 * scripts/build-model-manifest.mjs — keep models/models_manifest.json honest.
 *
 * The manifest drives the 3D gallery (src/views/models.js). Its curated
 * fields (name, weapon_id, game_category, slot, faction) were authored by
 * hand against the client asset dump and are preserved verbatim; every
 * measured field (bytes, dims, nodes, lods, textures, textured) is recomputed
 * from the GLB on disk so a later asset edit — scripts/fix_model_handedness.py
 * rewriting a node, a re-export, a new variant — cannot leave the manifest
 * describing a file that no longer looks like that.
 *
 *   node scripts/build-model-manifest.mjs           # rewrite the manifests
 *   node scripts/build-model-manifest.mjs --check   # fail if they are stale
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const modelsDir = path.join(root, 'models');
const manifestPath = path.join(modelsDir, 'models_manifest.json');
// The ER Ops Console ships its own copy of the manifest and is deployed
// straight from the folder, so it has to move in lockstep with the root one.
const mirrorPaths = [path.join(root, 'er-ops-console', 'models', 'models_manifest.json')];

// GLBs that are engine scaffolding or view-specific composites rather than
// browsable game assets. They stay on disk and stay out of the gallery.
const EXCLUDED = new Map([
  ['1x1_square.glb', 'engine primitive'],
  ['clouds.glb', 'engine skybox scenery'],
  ['default.glb', 'engine placeholder mesh'],
  ['skybox.glb', 'engine skybox'],
  ['sphere.glb', 'engine primitive'],
  ['Characters/f_Average_Studio.glb', 'character-builder composite (src/views/character.js)'],
  ['Characters/m_Average_Studio.glb', 'character-builder composite (src/views/character.js)'],
]);

// Field order for entries the generator has to create from scratch, matching
// the hand-authored ones so the file stays diff-friendly.
const KEY_ORDER = ['file', 'name', 'category', 'bytes', 'weapon_id', 'game_category',
  'slot', 'faction', 'dims', 'nodes', 'lods', 'textures', 'textured'];

function listModels() {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.glb')) out.push(path.relative(modelsDir, full).replaceAll(path.sep, '/'));
    }
  };
  walk(modelsDir);
  return out;
}

function readGlbJson(absolute) {
  const bytes = fs.readFileSync(absolute);
  if (bytes.toString('ascii', 0, 4) !== 'glTF') throw new Error(`${absolute} is not a binary glTF`);
  const jsonLength = bytes.readUInt32LE(12);
  return { json: JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8')), size: bytes.length };
}

/**
 * Measured geometry: the count of mesh-bearing nodes (the LOD chain — the
 * handedness marker node carries no mesh and is skipped) and the bounding box
 * spanning every distinct POSITION accessor, rounded the way the original
 * manifest rounds it.
 */
function measure(relative) {
  const { json, size } = readGlbJson(path.join(modelsDir, relative));
  const meshNodes = (json.nodes || []).filter((node) => typeof node.mesh === 'number');
  const low = [Infinity, Infinity, Infinity];
  const high = [-Infinity, -Infinity, -Infinity];
  const seen = new Set();
  for (const node of meshNodes) {
    for (const primitive of (json.meshes[node.mesh].primitives || [])) {
      const index = primitive.attributes?.POSITION;
      if (index === undefined || seen.has(index)) continue;
      seen.add(index);
      const accessor = json.accessors[index];
      if (!accessor?.min) continue;
      for (let axis = 0; axis < 3; axis += 1) {
        low[axis] = Math.min(low[axis], accessor.min[axis]);
        high[axis] = Math.max(high[axis], accessor.max[axis]);
      }
    }
  }
  const dims = seen.size
    ? low.map((min, axis) => Number((high[axis] - min).toFixed(1)))
    : [0, 0, 0];
  return { bytes: size, dims, nodes: meshNodes.length, lods: meshNodes.length };
}

function textureInfo(relative) {
  const sidecar = path.join(modelsDir, `${relative.slice(0, -4)}.texinfo.json`);
  if (!fs.existsSync(sidecar)) return { textures: [], textured: false };
  const textures = JSON.parse(fs.readFileSync(sidecar, 'utf8')).textures || [];
  return { textures, textured: textures.length > 0 };
}

/**
 * A new variant borrows its curated fields from the base asset it is a
 * variant of — `w1_hh2.glb` from `w1_hh.glb` — and labels itself with the
 * filename suffix, the same way the hand-authored skins do
 * (`Enfield Life Protector (pink)`). Nothing is invented: with no base entry
 * to borrow from, the bare filename stem is the name.
 */
function curatedFor(relative, byFile) {
  const stem = path.basename(relative, '.glb');
  const directory = relative.includes('/') ? `${relative.slice(0, relative.lastIndexOf('/'))}/` : '';
  const match = stem.match(/^(.*_hh)(?:(\d+)|_(.+))$/);
  const base = match && byFile.get(`${directory}${match[1]}.glb`);
  if (!base) return { name: stem };
  // `w1_hh2` is the second export of the `w1_hh` asset, so it is labelled by
  // the asset suffix itself; `w6_hh_pink` keeps its descriptive suffix.
  const suffix = match[2] ? `hh${match[2]}` : match[3];
  const curated = { name: `${base.name} (${suffix})` };
  for (const key of ['weapon_id', 'game_category', 'slot', 'faction']) {
    if (base[key] !== undefined) curated[key] = base[key];
  }
  return curated;
}

function orderKeys(entry) {
  const ordered = {};
  for (const key of KEY_ORDER) if (entry[key] !== undefined) ordered[key] = entry[key];
  for (const key of Object.keys(entry)) if (ordered[key] === undefined) ordered[key] = entry[key];
  return ordered;
}

export function buildManifest() {
  const existing = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const byFile = new Map(existing.models.map((entry) => [entry.file, entry]));
  const files = listModels().filter((file) => !EXCLUDED.has(file));

  const stale = existing.models.filter((entry) => !files.includes(entry.file)).map((entry) => entry.file);
  if (stale.length) throw new Error(`manifest lists files that are gone or excluded: ${stale.join(', ')}`);

  // Keep the authored order and append anything new, so the diff of a
  // re-run stays readable.
  const order = [...existing.models.map((entry) => entry.file)];
  for (const file of files) if (!byFile.has(file)) order.push(file);

  const models = order.map((file) => {
    const previous = byFile.get(file);
    const entry = {
      ...(previous ?? { file, ...curatedFor(file, byFile) }),
      category: file.includes('/') ? file.split('/')[0] : 'Misc',
      ...measure(file),
      ...textureInfo(file),
    };
    return previous ? entry : orderKeys(entry);
  });

  return { ...existing, models };
}

function serialise(manifest) {
  return `${JSON.stringify(manifest, null, 1)}\n`;
}

const check = process.argv.includes('--check');
const manifest = buildManifest();
const text = serialise(manifest);
const targets = [manifestPath, ...mirrorPaths];

if (check) {
  const drifted = targets.filter((target) => fs.readFileSync(target, 'utf8') !== text);
  if (drifted.length) {
    console.error('[build-model-manifest] stale:');
    for (const target of drifted) console.error(`  ${path.relative(root, target)}`);
    console.error('Run `npm run models:manifest` to regenerate.');
    process.exit(1);
  }
  console.log(`[build-model-manifest] ${manifest.models.length} models, manifests in sync`);
} else {
  for (const target of targets) fs.writeFileSync(target, text);
  console.log(`[build-model-manifest] wrote ${manifest.models.length} models to ${targets.length} manifest(s)`);
}
