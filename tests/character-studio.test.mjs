import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseGlb(relPath) {
  const bytes = fs.readFileSync(path.join(ROOT, relPath));
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8'));
  const binStart = 20 + jsonLength + 8;
  return { json, bin: bytes.subarray(binStart) };
}

function accessorRows(glb, accessorIndex) {
  const accessor = glb.json.accessors[accessorIndex];
  const view = glb.json.bufferViews[accessor.bufferView];
  const widths = { SCALAR: 1, VEC2: 2, VEC3: 3 };
  const width = widths[accessor.type];
  assert.equal(accessor.componentType, 5126, 'test helper expects float32');
  const stride = view.byteStride || width * 4;
  const start = (view.byteOffset || 0) + (accessor.byteOffset || 0);
  return Array.from({ length: accessor.count }, (_, row) =>
    Array.from({ length: width }, (_, component) => glb.bin.readFloatLE(start + row * stride + component * 4))
  );
}

function loadCharacterHelpers() {
  const source = fs.readFileSync(path.join(ROOT, 'src/views/character.js'), 'utf8');
  const context = { console };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'character.js' });
  return { source, context };
}

test('studio body GLBs contain every matching torso and leg silhouette', () => {
  for (const gender of ['f', 'm']) {
    const { json } = parseGlb(`models/Characters/${gender}_Average_Studio.glb`);
    const names = new Set((json.nodes || []).map((node) => node.name));
    for (const slot of ['Torso', 'Legs']) {
      for (let style = 1; style <= 4; style += 1) {
        assert.ok(names.has(`${slot}${style}`), `${gender} body is missing ${slot}${style}`);
      }
    }
  }
});

test('every numbered garment uses its AVG slot image, never torso armour', () => {
  for (const gender of ['f', 'm']) {
    const { json } = parseGlb(`models/Characters/${gender}_Average_Studio.glb`);
    const nodes = new Map(json.nodes.map((node) => [node.name, node]));
    const imageFor = (name) => {
      const primitive = json.meshes[nodes.get(name).mesh].primitives[0];
      const texture = json.materials[primitive.material].pbrMetallicRoughness.baseColorTexture.index;
      return json.textures[texture].source;
    };
    const torsoImages = new Set([1, 2, 3, 4].map((style) => imageFor(`Torso${style}`)));
    const legsImages = new Set([1, 2, 3, 4].map((style) => imageFor(`Legs${style}`)));
    assert.equal(torsoImages.size, 1, `${gender} torso styles must share the AVG torso image`);
    assert.equal(legsImages.size, 1, `${gender} leg styles must share the AVG legs image`);
    const armourName = [...nodes.keys()].find((name) => /^TorsoArmour/.test(name));
    assert.notEqual([...torsoImages][0], imageFor(armourName), `${gender} clothing must not reuse torso-armour image`);
  }
});

test('all generated garment normals are finite non-zero unit vectors', () => {
  for (const gender of ['f', 'm']) {
    const glb = parseGlb(`models/Characters/${gender}_Average_Studio.glb`);
    const nodes = new Map(glb.json.nodes.map((node) => [node.name, node]));
    for (const slot of ['Torso', 'Legs']) {
      for (let style = 1; style <= 4; style += 1) {
        const name = `${slot}${style}`;
        const primitive = glb.json.meshes[nodes.get(name).mesh].primitives[0];
        for (const normal of accessorRows(glb, primitive.attributes.NORMAL)) {
          const length = Math.hypot(...normal);
          assert.ok(Number.isFinite(length) && length > 0.99 && length < 1.01, `${gender} ${name} has invalid normal length ${length}`);
        }
      }
    }
  }
});

test('skin filename selects its matching geometry style', () => {
  const { context } = loadCharacterHelpers();
  assert.equal(context.studioStyleFromFile('f_AVG_Torso1_1.webp', 'Torso'), 1);
  assert.equal(context.studioStyleFromFile('m_AVG_Torso4_Black.webp', 'Torso'), 4);
  assert.equal(context.studioStyleFromFile('f_AVG_Legs3_7.webp', 'Legs'), 3);
  assert.equal(context.studioStyleFromFile('f_AVG_Legs2_4.webp', 'Torso'), null);
});

test('studio no longer labels clothing as bare skin or uses coverage guesses', () => {
  const { source } = loadCharacterHelpers();
  assert.doesNotMatch(source, /\(bare skin\)/i);
  assert.doesNotMatch(source, /\.coverage\b/);
});

test('studio prefers a fully clothed style-2 variant without pixel classification', () => {
  const { context } = loadCharacterHelpers();
  const entries = [
    { file: 'f_AVG_Torso1_1.webp' },
    { file: 'f_AVG_Torso2_4.webp' },
  ];
  assert.equal(context.studioPreferredEntry(entries, 'Torso').file, 'f_AVG_Torso2_4.webp');
  assert.equal(context.studioPreferredEntry([{ file: 'f_AVG_Torso1_6.webp' }], 'Torso').file, 'f_AVG_Torso1_6.webp');
});

test('export scene keeps only active clothing and checked gear nodes', () => {
  const { context } = loadCharacterHelpers();
  const nodes = [
    { name: 'Torso1' }, { name: 'Torso2' }, { name: 'Legs1' }, { name: 'Legs4' },
    { name: 'Helmet1' }, { name: 'Glasses1' },
  ];
  assert.deepEqual(
    Array.from(context.studioExportNodeIndices(nodes, 2, 4, new Set(['Helmet1']))),
    [1, 3, 4],
  );
});
