// tests/modal-focus-accessibility.test.mjs — modal focus + picker accessibility
// Regression contracts for the P1 accessibility slice:
//   · gear picker and item popup dialog semantics (role, aria-modal, labels)
//   · focus-in on open, focus trap while open
//   · Escape behavior, focus restoration on close
//   · picker listbox ARIA semantics (options, roving tabindex, arrow keys)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const engine = readFileSync(join(root, 'src', 'engine.js'), 'utf8');
const gear = readFileSync(join(root, 'src', 'views', 'gear.js'), 'utf8');
const init = readFileSync(join(root, 'src', 'app-init.js'), 'utf8');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const css = readFileSync(join(root, 'src', 'styles.css'), 'utf8');
const shellCss = readFileSync(join(root, 'src', 'styles/surviving-reference.css'), 'utf8');

describe('modal dialog semantics', () => {
  it('item detail popup is a labelled modal dialog', () => {
    assert.match(engine, /class="item-popup" role="dialog" aria-modal="true" aria-label="Item details for /);
  });

  it('gear picker is a labelled modal dialog', () => {
    assert.match(html, /class="gear-picker-modal" role="dialog" aria-modal="true" aria-labelledby="gear-picker-title"/);
  });

  it('keeps the gear picker above the fixed player bar', () => {
    const overlay = css.match(/\.gear-picker-overlay\s*\{[^}]*z-index:\s*(\d+)/s);
    const playerbar = shellCss.match(/\.playerbar\s*\{[^}]*z-index:\s*(\d+)/s);
    assert.ok(overlay && playerbar, 'expected stacking rules for both modal and player bar');
    assert.ok(Number(overlay[1]) > Number(playerbar[1]),
      `gear picker z-index ${overlay[1]} must exceed player bar z-index ${playerbar[1]}`);
  });

  it('dialog close controls carry accessible names', () => {
    assert.match(engine, /class="ip-close" aria-label="Close"/);
    assert.match(html, /id="gear-picker-close"[^>]*aria-label="Close"/);
  });
});

describe('focus-in', () => {
  it('item popup remembers the trigger and moves focus into the dialog on open', () => {
    assert.match(engine, /const lastFocused = document\.activeElement/);
    assert.match(engine, /querySelector\('\.ip-close'\)[\s\S]{0,140}\.focus\(\)/);
  });

  it('gear picker moves focus to the search field on open', () => {
    assert.match(gear, /gear-picker-search[\s\S]{0,220}\.focus\(\)/);
  });
});

describe('focus trap', () => {
  it('traps Tab inside the item popup', () => {
    assert.match(engine, /function onPopupKey/);
    assert.match(engine, /e\.key === 'Tab'/);
    assert.match(engine, /preventDefault\(\)/);
    assert.match(engine, /focusables\[focusables\.length - 1\]/);
  });

  it('traps Tab inside the gear picker', () => {
    assert.match(gear, /function onGearPickerKey/);
    assert.match(gear, /e\.key === 'Tab'/);
    assert.match(gear, /preventDefault\(\)/);
  });
});

describe('Escape behavior', () => {
  it('Escape closes the item popup through the shared close path', () => {
    assert.match(engine, /e\.key === 'Escape'/);
    assert.match(engine, /closePopup\(\)/);
  });

  it('Escape closes the gear picker through the shared close path', () => {
    assert.match(init, /e\.key === 'Escape'/);
    assert.match(init, /closeGearPicker\(\)/);
  });
});

describe('focus restoration', () => {
  it('item popup restores focus to the trigger on every close path', () => {
    assert.match(engine, /function closePopup\(\)/);
    assert.match(engine, /lastFocused\.focus\(\)/);
  });

  it('gear picker restores focus to the triggering slot on close', () => {
    assert.match(gear, /gearPickerTrigger/);
    assert.match(gear, /function closeGearPicker\(\)/);
    assert.match(gear, /trigger\.focus\(\)/);
    // Close button, backdrop click, and Escape all route through the shared close.
    assert.match(init, /gear-picker-close'\)\.addEventListener\('click', closeGearPicker\)/);
    assert.match(init, /e\.target === e\.currentTarget[\s\S]{0,60}closeGearPicker\(\)/);
  });

  it('gear slots are keyboard focusable so restoration lands on a real target', () => {
    const slotCount = (html.match(/class="gear-slot"/g) || []).length;
    assert.ok(slotCount >= 8, `expected at least 8 gear slots, found ${slotCount}`);
    assert.match(html, /class="gear-slot"[^>]*tabindex="0"/);
    assert.match(html, /class="gear-slot"[^>]*role="button"/);
    // Enter/Space on a slot opens the picker, so the loop is keyboard-usable.
    assert.match(init, /slot\.addEventListener\('keydown'/);
    assert.match(init, /e\.key === 'Enter'/);
    assert.match(init, /showGearPicker\(/);
  });
});

describe('gear picker listbox ARIA', () => {
  it('labels the option list as a listbox', () => {
    assert.match(html, /id="gear-picker-items"[^>]*role="listbox"/);
    assert.match(html, /id="gear-picker-items"[^>]*aria-labelledby="gear-picker-title"/);
  });

  it('renders options with option role, ids, and aria-selected', () => {
    assert.match(gear, /setAttribute\('role', 'option'\)/);
    assert.match(gear, /gear-picker-opt-/);
    assert.match(gear, /aria-selected/);
  });

  it('implements roving tabindex so exactly one option is in the tab order', () => {
    assert.match(gear, /tabIndex = /);
    assert.match(gear, /gearPickerActiveIndex \? 0 : -1/);
  });

  it('arrow keys move the active option via aria-activedescendant', () => {
    assert.match(gear, /function moveGearPickerActive/);
    assert.match(gear, /'ArrowDown'/);
    assert.match(gear, /'ArrowUp'/);
    assert.match(gear, /'Home'/);
    assert.match(gear, /'End'/);
    assert.match(gear, /aria-activedescendant/);
    assert.match(gear, /active\.focus\(\)/);
  });

  it('Enter or Space selects the focused option', () => {
    assert.match(gear, /e\.key === 'Enter'/);
    assert.match(gear, /selectItem\(/);
  });

  it('keeps the calculator picker grid labelled as a listbox', () => {
    assert.match(html, /id="picker-grid"[^>]*role="listbox"/);
    assert.match(html, /id="picker-grid"[^>]*aria-label="Final items"/);
  });
});
