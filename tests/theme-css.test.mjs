// tests/theme-css.test.mjs — CSS regression guard: select dropdown arrows must
// never tile. Root cause (recurred 50+ times): a `background:` SHORTHAND on a
// select resets background-repeat to `repeat` and background-position to
// `0% 0%`; the per-theme `[data-theme=X] select` rules then re-apply the arrow
// as a background-image, so the 10x6px chevron tiles into a grid across the
// whole control (seen as a wall of orange triangles behind "Paris"/"Berlin").
// This test fails the build if either half of that bug is reintroduced.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const cssDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const css = readFileSync(join(cssDir, 'styles.css'), 'utf8');
const tokenCss = readFileSync(join(cssDir, 'styles', 'tokens.css'), 'utf8');
const shellCss = readFileSync(join(cssDir, 'styles', 'shell.css'), 'utf8');
const componentCss = readFileSync(join(cssDir, 'styles', 'components.css'), 'utf8');
const viewCss = readFileSync(join(cssDir, 'styles', 'views.css'), 'utf8');
const allCss = [css, tokenCss, shellCss, componentCss, viewCss].join('\n');

// --- minimal CSS rule parser: top-level `selector { body }` blocks, comments stripped ---
function topLevelRules(src) {
  const noComments = src.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  let i = 0;
  const n = noComments.length;
  while (i < n) {
    const open = noComments.indexOf('{', i);
    if (open < 0) break;
    const sel = noComments.slice(i, open).trim();
    // brace-match the body (handles nested blocks like @keyframes)
    let depth = 1, j = open + 1;
    while (j < n && depth > 0) {
      if (noComments[j] === '{') depth++;
      else if (noComments[j] === '}') depth--;
      j++;
    }
    const body = noComments.slice(open + 1, j - 1);
    if (sel) rules.push({ sel, body });
    i = j;
  }
  return rules;
}

const rules = topLevelRules(css);

/** Is this selector target a <select> element? (ends with `select`, e.g.
 *  `select`, `.gear-dest-select`, `.help-toolbar select`,
 *  `[data-theme="cmg"] select`) */
const isSelectRule = sel => /(?:^|[\s,>+~]|\.)select\s*$/.test(sel.trim());

/** Match a property named exactly `background` (not `background-color`/`-image`). */
const hasBgShorthand = body => /(?:^|;)\s*background\s*:/.test(body);

/** Themed select rules: `[data-theme="X"] select` exactly. */
const themedSelectRules = rules.filter(r => /\[\s*data-theme="[^"]+"\s*\]\s+select\s*$/.test(r.sel.trim()));

describe('design-system CSS boundaries', () => {
  it('loads the four staged CSS layers before legacy compatibility rules', () => {
    assert.match(css, /^@import url\("styles\/tokens\.css"\);\n@import url\("styles\/shell\.css"\);\n@import url\("styles\/components\.css"\);\n@import url\("styles\/views\.css"\);/);
    assert.match(tokenCss, /--motion-fast:\s*120ms/);
    assert.match(tokenCss, /--motion-base:\s*180ms/);
    assert.match(tokenCss, /--motion-slow:\s*280ms/);
    assert.match(shellCss, /--shell-content-max/);
    assert.match(componentCss, /--component-touch-target:\s*44px/);
    assert.match(viewCss, /--view-outcome-width/);
  });

  it('declares every referenced custom property in the staged CSS set', () => {
    const declarations = new Set([...allCss.matchAll(/--([a-z0-9-]+)\s*:/gi)].map(m => m[1]));
    const referenced = new Set([...allCss.matchAll(/var\(--([a-z0-9-]+)/gi)].map(m => m[1]));
    const missing = [...referenced].filter(name => !declarations.has(name));
    assert.deepEqual(missing, [], `undefined custom properties: ${missing.join(', ')}`);
  });
});


describe('select dropdown arrows', () => {
  it('no select rule may use the `background:` shorthand (it resets repeat/position)', () => {
    const offenders = rules.filter(r => isSelectRule(r.sel) && hasBgShorthand(r.body));
    assert.deepEqual(
      offenders.map(r => r.sel),
      [],
      'A `background:` shorthand on a select resets background-repeat to repeat, ' +
      'so the themed arrow tiles across the control. Use `background-color:` instead ' +
      '(see the comment above .gear-picker-toolbar select in styles.css).'
    );
  });

  it('every themed select rule pins no-repeat + right-edge position + size', () => {
    assert.ok(themedSelectRules.length >= 4, 'expected the 4 themed select rules to exist');
    const broken = themedSelectRules.filter(r =>
      !/background-repeat\s*:\s*no-repeat/.test(r.body) ||
      !/background-position\s*:/.test(r.body) ||
      !/background-size\s*:/.test(r.body)
    );
    assert.deepEqual(
      broken.map(r => r.sel),
      [],
      'Themed select rules must set background-repeat: no-repeat, a right-edge ' +
      'background-position and an explicit background-size, so the chevron can ' +
      'never tile even if a future rule uses the background shorthand.'
    );
  });

  it('gear tab colony dropdown uses background-color, not the shorthand', () => {
    const gearDest = rules.find(r => r.sel.trim() === '.gear-dest-select');
    assert.ok(gearDest, '.gear-dest-select rule must exist');
    assert.ok(!hasBgShorthand(gearDest.body), '.gear-dest-select must use background-color');
    assert.match(gearDest.body, /background-color\s*:\s*var\(--panel\)/);
  });
});
