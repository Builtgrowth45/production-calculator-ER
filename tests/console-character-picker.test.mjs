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
const PICKERS = ['charFaceTabs', 'charHairTabs', 'charSkinTabs', 'charTopTabs', 'charLegsTabs', 'charStyleTabs'];

describe('ER Ops Console character picker', () => {
  it('keeps the embedded document and app code parseable', () => {
    assert.ok(inner.startsWith('<!DOCTYPE html>'), 'inner document is not a document');
    assert.ok(appCode.length > 1000, 'app code looks truncated');
    // A syntax error here would be a blank live site.
    assert.doesNotThrow(() => new Function(`return (function(){${appCode}\n});`));
  });

  it('renders a control for every appearance part', () => {
    for (const list of PICKERS) {
      assert.equal(inner.split(`{{ ${list} }}`).length - 1, 1, `${list} not bound once in the template`);
      assert.match(appCode, new RegExp(`${list}:`), `${list} not computed`);
    }
    for (const label of ['FACE', 'HAIR', 'SKIN', 'TOP', 'LEGS', 'STYLE']) {
      assert.ok(inner.includes(`>${label}<`), `${label} has no label in the panel`);
    }
  });

  it('changes only the part that was picked', () => {
    // _setRoll merges into the existing roll, so choosing a face must not
    // reshuffle the outfit the way ⟳ RANDOMIZE does.
    assert.match(appCode, /_setRoll\(patch\) \{ this\.setState\(\{ charRoll: Object\.assign\(\{\}, this\.state\.charRoll \|\| \{\}, patch\) \}\); \}/);
    for (const list of PICKERS) {
      const body = appCode.slice(appCode.indexOf(`${list}:`));
      assert.match(body.slice(0, 260), /this\._setRoll\(/, `${list} should pick, not re-roll`);
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
    // The lists in the code are the lists on disk, not a superset.
    assert.match(appCode, /charFaceTabs: \[1, 6, 7, 8, 9, 21, 24\]/);
    assert.match(appCode, /charHairTabs: \[1, 2, 3\]/);
  });
});
