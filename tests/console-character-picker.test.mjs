// tests/console-character-picker.test.mjs — the ER Ops Console character panel.
//
// The console is one generated file: the page embeds its whole inner document
// as a JSON string, and that document embeds the app class as script text. A
// mis-escaped edit anywhere in that chain takes the entire live site down
// rather than breaking one panel, so these tests walk the chain and check it
// still parses before checking the picker itself.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consoleDir = path.join(root, 'er-ops-console');
const page = fs.readFileSync(path.join(consoleDir, 'index.html'), 'utf8');

const OPEN = '<script type="__bundler/template">';
const start = page.indexOf(OPEN) + OPEN.length;
const inner = JSON.parse(page.slice(start, page.indexOf('</script>', start)).trim());
const appCode = (() => {
  for (const match of inner.matchAll(/<script[^>]*>/g)) {
    const from = match.index + match[0].length;
    const to = inner.indexOf('</script>', from);
    const code = inner.slice(from, to < 0 ? inner.length : to);
    if (code.includes('_rollChar')) return code;
  }
  throw new Error('console app code not found');
})();

// What the panel offers, and the asset each choice resolves to.
const FACES = [1, 6, 7, 8, 9, 21, 24];
const HAIR = [1, 2, 3];
const TONES = ['Black', 'White'];
const PICKERS = ['charFaceTabs', 'charHairTabs', 'charSkinTabs', 'charTopTabs', 'charLegsTabs', 'charStyleTabs',
  'charFaceShapeTabs', 'charHairShapeTabs', 'charGlassesTabs'];

describe('ER Ops Console character picker', () => {
  it('keeps the embedded document and app code parseable', () => {
    assert.ok(inner.startsWith('<!DOCTYPE html>'), 'inner document is not a document');
    assert.ok(appCode.length > 1000, 'app code looks truncated');
    // A syntax error here would be a blank live site.
    assert.doesNotThrow(() => new Function(`return (function(){${appCode}\n});`));
  });

  it('renders a control for every appearance part', () => {
    for (const list of PICKERS) {
      const bound = inner.split(`{{ ${list} }}`).length - 1;
      assert.ok(bound >= 1, `${list} not bound in the template`);
      assert.match(appCode, new RegExp(`${list}:`), `${list} not computed`);
    }
    for (const label of ['FACE', 'HAIR', 'SKIN', 'TOP', 'LEGS', 'STYLE']) {
      assert.ok(inner.includes(`>${label}<`), `${label} has no label in the panel`);
    }
  });

  it('changes only the part that was picked', () => {
    // _setRoll merges into the existing roll, so choosing a face must not
    // reshuffle the outfit the way ⟳ RANDOMIZE does.
    assert.match(appCode, /const roll = Object\.assign\(\{\}, this\.state\.charRoll \|\| \{\}, patch\);/);
    for (const list of PICKERS.filter((name) => !name.includes('Shape'))) {
      const body = appCode.slice(appCode.indexOf(`${list}:`));
      assert.match(body.slice(0, 320), /this\._setRoll\(|this\._variantTabs\(/, `${list} should pick, not re-roll`);
    }
    // Both shape and variant builders go through _setRoll too.
    for (const helper of ['_shapeTabs', '_variantTabs']) {
      const body = appCode.slice(appCode.indexOf(`${helper}(part`));
      assert.match(body.slice(0, 900), /this\._setRoll\(/, `${helper} should pick, not re-roll`);
    }
  });

  it('makes skin tone its own choice rather than a face side effect', () => {
    assert.match(appCode, /_skinToneOf\(\) \{/);
    assert.match(appCode, /roll\._skinTone \|\| \(\(roll\._faceIdx \|\| 1\) === 21 \? 'Black' : 'White'\)/);
    // The old inline derivation must be gone from the texture path.
    assert.doesNotMatch(appCode, /_Hands1_' \+ \(FACE_IDX === 21/);
  });

  it('lets an explicit clothing pick override the rolled one', () => {
    assert.match(appCode, /const chosen = roll\[kind === 'Torso' \? '_topIdx' : '_botIdx'\]/);
    assert.match(appCode, /typeof chosen === 'number' \? chosen : Math\.floor\(pick \* list\.length\)/);
    // Index arithmetic stays in range for any list length.
    assert.match(appCode, /\(\(at % list\.length\) \+ list\.length\) % list\.length/);
  });

  it('offers every shape and map the part index carries', () => {
    // Faces and hair come from models/character_parts.json over the CDN, so the
    // panel is not limited to the ten maps bundled under assets/heads_sm.
    assert.match(appCode, /fetch\(this\.REMOTE \+ 'models\/character_parts\.json'\)/);
    assert.match(appCode, /_partTex\(part, shape, variant, fallback\)/);
    assert.match(appCode, /return hit \? this\.REMOTE \+ hit\.file : fallback;/);
    // Changing shape lands on a map that shape actually has.
    assert.match(appCode, /const first = \(this\._partList\(part, sh\)\[0\] \|\| \{\}\)\.variant;/);
  });

  it('gives the character its own first tab, named after the character', () => {
    assert.match(appCode, /\['me', \(p && p\.name\) \|\| 'My Character'\]/);
    assert.match(appCode, /tabMe: T\('me'\)/);
    assert.equal(inner.split('{{ tabMe }}').length - 1, 1, 'My Character section missing');
    assert.ok(inner.includes('data-screen-label="My Character"'));
    // 'me' must come before every other tab in the nav list.
    const nav = appCode.slice(appCode.indexOf('navItems: ['), appCode.indexOf("['calc', 'Calculator']"));
    assert.ok(nav.includes("['me',"), 'My Character is not the first nav item');
  });

  it('keeps the character on the gear loadout as well as its own tab', () => {
    assert.equal(inner.split('{{ charViewerRef }}').length - 1, 2,
      'expected a viewer on both the My Character tab and the Gear panel');
  });

  it('saves the character onto the player so it survives a reload', () => {
    assert.match(appCode, /_saveLook\(roll\) \{/);
    assert.match(appCode, /look: \{ sex: S\.charSex, faction: S\.charFaction, roll \}/);
    assert.match(appCode, /this\._saveLook\(roll\);/);
    // And is restored instead of re-rolled when one exists.
    assert.match(appCode, /if \(saved0 && saved0\.roll\) this\.setState\(/);
    assert.match(appCode, /else this\.setState\(this\._rollChar\('m'\)\);/);
  });

  it('lets the character be named and given a faction on that tab', () => {
    for (const binding of ['{{ meName }}', '{{ onMeName }}', '{{ meNameSave }}', '{{ meFaction }}', '{{ onMeFaction }}', '{{ meFactionOptions }}']) {
      assert.ok(inner.includes(binding), `${binding} missing from the template`);
    }
    assert.match(appCode, /meNameSave: \(\) => \{/);
    assert.match(appCode, /if \(name\.length < 2\) return;/);
    assert.match(appCode, /onMeFaction: \(e\) => \{ this\._savePlayer\(\{ faction: e\.target\.value \}\)/);
  });

  it('leaves only the character model on the Gear loadout tab', () => {
    // The Gear card carried a full duplicate of the editor above its viewer.
    // Editing belongs on My Character; Gear just shows who you built.
    const from = inner.indexOf('grid-column: 3; grid-row: 1 / span 2');
    assert.ok(from > 0, 'Gear character card not found');
    const gearCard = inner.slice(from, from + 3000);
    assert.ok(gearCard.includes('{{ charViewerRef }}'), 'Gear card lost the 3D viewer');
    for (const control of ['{{ charSexTabs }}', '{{ charFaceShapeTabs }}', '{{ charGlassesTabs }}',
      '{{ charStyleTabs }}', '{{ charReroll }}']) {
      assert.ok(!gearCard.includes(control), `${control} still on the Gear card`);
    }

    // ...and every one of them is still reachable on My Character.
    const me = inner.slice(inner.indexOf('{{ tabMe }}'), inner.indexOf('{{ tabCalc }}'));
    for (const control of [...PICKERS, 'charSexTabs', 'charReroll']) {
      assert.ok(me.includes(`{{ ${control} }}`), `${control} missing from My Character`);
    }
    assert.ok(me.includes('{{ charViewerRef }}'), 'My Character lost the 3D viewer');
    // Faction there is the select that saves onto the player record, so the
    // Gear card's chip row was a second, non-persisting way to set it.
    assert.ok(me.includes('{{ meFaction }}') && me.includes('{{ onMeFaction }}'));
    assert.equal(inner.split('{{ charFactionTabs }}').length - 1, 0, 'charFactionTabs is bound nowhere');
    assert.ok(!appCode.includes('charFactionTabs:'), 'charFactionTabs computed but unused');
  });

  it('never generates sunglasses, and makes them a pick', () => {
    // They used to appear on a quarter of rolls with no way to take them off.
    assert.match(appCode, /roll\._glasses = false;/);
    assert.doesNotMatch(appCode, /roll\._glasses = Math\.random\(\)/);
    assert.match(appCode, /charGlassesTabs: \[\['', 'OFF'\], \['1', 'ON'\]\]/);
    // One row only: the controls live on the My Character tab, not the Gear card.
    assert.equal(inner.split('{{ charGlassesTabs }}').length - 1, 1, 'GLASSES missing from the row');
    assert.ok(inner.includes('>GLASSES<'));
  });

  it('offers all four torso garments, not just the two shirts', () => {
    assert.match(appCode, /charTopTabs: \[1, 2, 3, 4\]/);
    // The clamp that folded 3 and 4 back onto 1 and 2 is gone.
    assert.match(appCode, /_chestVar\(\) \{ const v = .*return \(\(v - 1\) % 4\) \+ 1; \}/);
    assert.doesNotMatch(appCode, /return \(\(v - 1\) % 2\) \+ 1;/);
  });

  it('offers as many clothing styles as the garment and faction actually have', () => {
    // Was a hardcoded six regardless of how many skins existed.
    assert.match(appCode, /charStyleTabs: this\._texList\('Torso' \+ this\._chestVar\(\)\)\.map/);
    assert.doesNotMatch(appCode, /charStyleTabs: \[0, 1, 2, 3, 4, 5\]/);
    // _texList is the shared list; _texFor still resolves one entry from it.
    assert.match(appCode, /_texList\(meshName\) \{/);
    assert.match(appCode, /const list = this\._texList\(meshName\);/);
  });

  it('bundles the part index so a CDN miss cannot collapse the pickers', () => {
    const bundled = path.join(consoleDir, 'models', 'character_parts.json');
    assert.ok(fs.existsSync(bundled), 'console copy of character_parts.json missing');
    const local = JSON.parse(fs.readFileSync(bundled, 'utf8'));
    const source = JSON.parse(fs.readFileSync(path.join(root, 'models', 'character_parts.json'), 'utf8'));
    assert.deepEqual(local, source, 'console copy has drifted from the source index');
    // Local first, CDN second, and a recorded failure rather than a silent one.
    assert.match(appCode, /fetch\('models\/character_parts\.json'\)/);
    assert.match(appCode, /\.catch\(\(\) => fetch\(this\.REMOTE \+ 'models\/character_parts\.json'\)/);
    assert.match(appCode, /charPartsFailed: true/);
    // And it really carries every shape, so the pickers have something to show.
    assert.equal(Object.keys(local.parts.f.Face).length, 4);
    assert.equal(Object.keys(local.parts.f.Hair).length, 13);
    assert.equal(Object.keys(local.parts.m.Hair).length, 13);
  });

  it('only offers faces, hair and tones the console actually ships', () => {
    const heads = path.join(consoleDir, 'assets', 'heads_sm');
    for (const gender of ['f', 'm']) {
      for (const face of FACES) {
        assert.ok(fs.existsSync(path.join(heads, `${gender}_Face1_${face}.png`)), `${gender}_Face1_${face}.png missing`);
      }
      for (const hair of HAIR) {
        assert.ok(fs.existsSync(path.join(heads, `${gender}_Hair1_${hair}.png`)), `${gender}_Hair1_${hair}.png missing`);
      }
      for (const tone of TONES) {
        assert.ok(fs.existsSync(path.join(heads, `${gender}_Hands1_${tone}.png`)), `${gender}_Hands1_${tone}.png missing`);
      }
    }
    // Those bundled files remain the fallback when the full index is unreachable.
    assert.match(appCode, /_variantTabs\('Face', '_faceShape', '_faceIdx', 1, \[1, 6, 7, 8, 9, 21, 24\]\)/);
    assert.match(appCode, /_variantTabs\('Hair', '_hairShape', '_hairIdx', 1, \[1, 2, 3\]\)/);
  });
});
