import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const registry = JSON.parse(readFileSync(join(root, 'data/factions.json'), 'utf8'));
const core = readFileSync(join(root, 'src/app-core.js'), 'utf8');
const app = readFileSync(join(root, 'src/app.js'), 'utf8');
const init = readFileSync(join(root, 'src/app-init.js'), 'utf8');
const docs = readFileSync(join(root, 'docs/factions-and-economics.md'), 'utf8');

const politicalFactions = registry.factions.filter(f => f.id !== 'UNAFFILIATED');

describe('universal colony income', () => {
  it('gives every colony-owning faction the same 85% pre-tax return', () => {
    assert.ok(politicalFactions.length >= 8);
    for (const faction of politicalFactions) {
      assert.equal(faction.return_rate, 0.85, `${faction.id} should receive 85% at its colonies`);
      assert.equal(faction.return_rate_status, 'confirmed-universal');
    }
    const unaffiliated = registry.factions.find(f => f.id === 'UNAFFILIATED');
    assert.equal(unaffiliated.return_rate, null);
  });

  it('removes tax before computing owner and Global Dominion shares', () => {
    assert.match(core, /ownerEligibleSpend/);
    assert.match(core, /preTaxSpend/);
    assert.match(core, /GLOBAL_DOMINION_RATE\s*=\s*0\.15/);
    assert.match(core, /globalDominion.*preTaxSpend\s*\*\s*GLOBAL_DOMINION_RATE/s);
    assert.match(core, /fdcDominionShare.*globalDominion\s*\/\s*2/s);
    assert.match(core, /ledDominionShare.*globalDominion\s*\/\s*2/s);
    assert.match(core, /rebate:\s*ownerEligibleSpend\s*\*\s*activeFactionReturnRate\(\)/);
  });

  it('labels the 15% FDC/LED split as an assumption', () => {
    assert.match(core, /Global Dominion/i);
    assert.match(core, /assumed 50\/50/i);
    assert.match(docs, /85%[\s\S]*before tax/i);
    assert.match(docs, /15%[\s\S]*Global Dominion/i);
    assert.match(docs, /assum(?:e|ed|ption)[\s\S]*50\/50[\s\S]*FDC[\s\S]*LED/i);
  });

  it('uses faction-neutral refinement-path copy', () => {
    assert.doesNotMatch(app, /net of the CMG rebate/);
    assert.match(app, /85% owner return/i);
  });
});

describe('staged calculator selection', () => {
  it('selects an item without calculating or scrolling', () => {
    const pickerHandler = init.match(/document\.getElementById\('picker-grid'\)\.addEventListener\('click',[\s\S]*?\n\s*\}\);/);
    assert.ok(pickerHandler, 'picker click handler should exist');
    assert.match(pickerHandler[0], /calc-item/);
    assert.doesNotMatch(pickerHandler[0], /runCalculator\(/);
    assert.doesNotMatch(pickerHandler[0], /scrollIntoView/);
  });

  it('leaves quantity and colony configuration available and scrolls only after Calculate', () => {
    assert.match(init, /calc-item/);
    assert.doesNotMatch(init.match(/document\.getElementById\('picker-grid'\)\.addEventListener\('click',[\s\S]*?\n\s*\}\);/)[0], /focus\(|select\(/);
    assert.match(app, /function runCalculator\(\)[\s\S]*out\.scrollIntoView\(/);
  });
});
