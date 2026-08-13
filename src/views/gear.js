/**
 * src/views/gear.js — Gear textures + local data
 * ============================================================================
 * DTX armor texture lookup, local requests, gear library, inventory, and
 * colony settings. The public build deliberately has no remote sync dependency.
 */
'use strict';

// § GEAR TEXTURE LOOKUP — maps item names to DTX armor textures
// ═══════════════════════════════════════════════════════════════════════════

/** Slot name → DTX texture slot ID */
const SLOT_TO_TEX = {
  Helmet: 'Helmet', ShoulderPads: 'ShoulderPads', TorsoArmor: 'TorsoArmour',
  ArmPads: 'ArmPads', LegPads: 'LegPads',
};

/** Detect faction from item name or use default */
function detectFaction(itemName) {
  const upper = (itemName || '').toUpperCase();
  if (upper.includes('BOS') || upper.includes('BROTHERHOOD')) return 'BOS';
  if (upper.includes('CMG')) return 'CMG';
  if (upper.includes('ECLIPSE') || upper.includes('EC ')) return 'EC';
  if (upper.includes('FDC')) return 'FDC';
  if (upper.includes('GOM')) return 'GOM';
  if (upper.includes('LED')) return 'LED';
  if (upper.includes('MOB')) return 'MOB';
  if (upper.includes('VTX') || upper.includes('VORTEX')) return 'VTX';
  return 'CMG'; // default faction
}

/** Detect armor tier from item name keywords */
function detectTier(itemName) {
  var n = (itemName || '').toLowerCase();
  if (/basic|tier 1|mk.?1|t1/i.test(n)) return 1;
  if (/modified|tier 2|mk.?2|t2/i.test(n)) return 2;
  if (/advanced|tier 3|mk.?3|t3|tremor/i.test(n)) return 3;
  if (/altered|tier 4|mk.?4|t4/i.test(n)) return 4;
  if (/powered|tier 5|mk.?5|t5/i.test(n)) return 5;
  if (/tactical|tier 6|mk.?6|t6|spec|ops/i.test(n)) return 6;
  if (/elite|tier 7|mk.?7|t7|prototype/i.test(n)) return 7;
  return 4; // default mid-tier
}

/** Get DTX armor texture path for an equipped item */
function getArmorTexture(itemName, slotName) {
  if (!itemName) return null;
  var texSlot = SLOT_TO_TEX[slotName];
  if (!texSlot) return null;
  var faction = detectFaction(itemName);
  var tier = detectTier(itemName);
  // Try with detected tier, fall back to tier 4
  var paths = [
    'gear_textures/' + faction + '/' + texSlot + '.png',
    'gear_textures/CMG/' + texSlot + '.png',
  ];
  return paths[0]; // return primary path (browser handles 404 via onerror)
}

function renderGear() {
  document.querySelectorAll('.gear-slot').forEach(slot => {
    const slotName = slot.dataset.slot;
    const slotType = slot.dataset.slotType || 'armor';
    let itemName; let isActive = true;
    if (slotType === 'armor') { itemName = GEAR[slotName]; }
    else if (slotType === 'booster') { itemName = BOOSTERS[parseInt(slotName.split('-')[1])]; isActive = BOOSTER_ACTIVE[parseInt(slotName.split('-')[1])] !== false; }
    else if (slotType === 'medikit') { itemName = MEDIKIT; isActive = MEDIKIT_ACTIVE; }
    const icon = slot.querySelector('.gear-slot-icon');
    if (itemName) {
      slot.classList.add('equipped');
      if (!isActive) slot.classList.add('inactive'); else slot.classList.remove('inactive');
      icon.innerHTML = iconFor(itemName);
      let nameEl = slot.querySelector('.gear-slot-name');
      if (!nameEl) { nameEl = document.createElement('div'); nameEl.className = 'gear-slot-name'; slot.appendChild(nameEl); }
      nameEl.textContent = itemName;
      let statEl = slot.querySelector('.gear-slot-stats');
      if (!statEl) { statEl = document.createElement('div'); statEl.className = 'gear-slot-stats'; }
      const recipe = DATA.recipes.find(r => r.output.item === itemName);
      // Armor-slot implants check GEAR_ACTIVE, regular armor is always active
      if (slotType === 'armor' && recipe && recipe.output.category === 'Implants & Electronics') {
        isActive = GEAR_ACTIVE[slotName] !== false;
      }
      if (recipe?.output?.stats) {
        var hiddenStats = ['durationseconds','medkitcooldown','protectionreduction','addiction','illegal'];
        statEl.innerHTML = Object.entries(recipe.output.stats).filter(function(e){return hiddenStats.indexOf(e[0])===-1;}).map(function(e) {
          var k = e[0], v = e[1];
          var label = (STAT_LABELS && STAT_LABELS[k]) ? STAT_LABELS[k] : k.substring(0,4);
          return '<span class="gear-slot-stat">' + label + ' <b class="gss-val">' + (v > 0 ? '+' : '') + v + '</b></span>';
        }).join('');
        if (statEl.parentNode !== slot) slot.appendChild(statEl);
      } else { statEl.remove(); }
      // Toggle for implants, boosters, medikit
      var showToggle = (slotType === 'medikit' || slotType === 'booster');
      if (slotType === 'armor' && recipe && recipe.output.category === 'Implants & Electronics') showToggle = true;
      if (showToggle) {
        var toggleEl = slot.querySelector('.gear-toggle');
        if (!toggleEl) { toggleEl = document.createElement('input'); toggleEl.type='checkbox'; toggleEl.className='gear-toggle'; toggleEl.title='Active'; toggleEl.addEventListener('click',function(e){e.stopPropagation();}); slot.appendChild(toggleEl); }
        toggleEl.checked = isActive;
        toggleEl.onchange = function() {
          if (slotType === 'armor') { GEAR_ACTIVE[slotName] = toggleEl.checked; }
          else if (slotType === 'booster') { BOOSTER_ACTIVE[parseInt(slotName.split('-')[1])] = toggleEl.checked; }
          else { MEDIKIT_ACTIVE = toggleEl.checked; }
          saveToggles();
          renderGearStats(); renderGearCost(); slot.classList.toggle('inactive', !toggleEl.checked);
        };
      }
    } else {
      slot.classList.remove('equipped', 'inactive');
      icon.innerHTML = '<span class="gear-slot-placeholder">+</span>';
      ['gear-slot-name','gear-slot-stats','gear-toggle'].forEach(function(c){var el=slot.querySelector('.'+c);if(el)el.remove();});
    }
  });
  renderGearStats();
  renderGearCost();
  renderGearDest();
  wireGearDest();
}

function renderGearStats() {
  const grid = document.getElementById('gear-stat-grid');
  if (!grid) return;
  const stats = computeGearStats();
  var skipStat = {durationseconds:1,medkitcooldown:1,protectionreduction:1};
  
  // Compute protection reduction from active medikit
  var protRed = 0;
  if (MEDIKIT && MEDIKIT_ACTIVE) {
    var mr = DATA.recipes.find(function(r){return r.output.item === MEDIKIT;});
    protRed = mr?.output?.stats?.protectionreduction || 0;
  }
  var protMult = (1 - protRed / 100); // e.g. 0.8 for 20% reduction
  var protKeys = ['armor','shielding','endurance','resistance','reflection'];
  
  const entries = Object.entries(stats).filter(function(e){return e[1]!==0&&!skipStat[e[0]];});
  if (!entries.length) {
    grid.innerHTML = '<div class="muted" style="font-size:0.75rem;grid-column:1/-1">Equip armor to see stats</div>';
    return;
  }
  
  var html = '';
  if (protRed > 0) {
    html += '<div class="gear-stat-notice">Medikit: -' + Math.round(protRed) + '% protection</div>';
  }
  
  entries.forEach(function(e) {
    var k = e[0], v = e[1];
    var label = STAT_LABELS[k] || k;
    var affected = protRed > 0 && protKeys.indexOf(k) !== -1;
    var displayV = affected ? v * protMult : v;
    var cls = displayV < 0 ? 'stat-val bad' : 'stat-val';
    if (affected) cls += ' prot-nerfed';
    var badge = affected ? ' <span class="prot-badge">×' + Math.round(protMult*100) + '%</span>' : '';
    var tip = STAT_DEFS[k] ? ' title="' + esc(STAT_DEFS[k]) + '"' : '';
    html += '<div class="gear-stat-item"' + tip + '><div class="' + cls + '">' + (displayV>0?'+':'') + Math.round(displayV*10)/10 + badge + '</div><div class="stat-label">' + label + '</div></div>';
  });
  
  grid.innerHTML = html;
}

// Full recipe-tree cost to craft one of each equipped piece — the same plan
// machinery the calculator uses (compute → planCost → costBreakdown), so
// taxes, mine sites, slot levels and the session drift all apply, and the
// CMG faction rebate comes out exactly as it does on the Calculator tab.
const GEAR_PLAN_CACHE = {};
function computeGearPlan() {
  const sig = JSON.stringify(GEAR) + '|' + unitCostSignature();
  if (GEAR_PLAN_CACHE._sig === sig) return GEAR_PLAN_CACHE.plan;
  // Equipped armor pieces only (implants, boosters, medikits are skipped).
  const pieces = Object.values(GEAR).filter(itemName => {
    if (!itemName) return false;
    const recipe = DATA.recipes.find(r => r.output.item === itemName);
    return recipe && recipe.output.category !== 'Implants & Electronics' && recipe.output.category !== 'Drugs' && recipe.output.category !== 'Medical';
  });
  // One tray compute for the whole set — the SAME call the Calculator's
  // multi-item tray makes (compute(items[], chosen, ledger, invLoc, dest,
  // discounts)). Sharing the ledger aggregates demand across the pieces, so
  // the set's batches, total and CMG rebate match the Calculator exactly —
  // summing per-piece plans over-counts surplus batches and can even pick
  // different mine sites, which is why the panel used to disagree with Craft Set.
  const plan = { steps: [], acquire: {}, refine: [], manufacture: [], transport: {}, surplus: {}, _pieces: pieces.length };
  if (pieces.length) {
    try {
      const res = compute(pieces.map(item => ({ item, qty: 1 })), ALTERNATIVE_CHOICES, {}, null, DESTINATION, null);
      Object.assign(plan, res.plan);
    } catch (e) { /* cycle or bad recipe — leave the empty plan */ }
  }
  plan._pieces = pieces.length;
  GEAR_PLAN_CACHE._sig = sig;
  GEAR_PLAN_CACHE.plan = plan;
  return plan;
}

function renderGearCost() {
  const grid = document.getElementById('gear-cost-grid');
  if (!grid) return;
  const plan = computeGearPlan();
  const entries = Object.entries(plan.acquire || {}).sort((a, b) => (b[1].qty || 0) - (a[1].qty || 0));
  if (!plan._pieces) {
    grid.innerHTML = '<div class="muted" style="font-size:0.75rem;grid-column:1/-1">Equip armor to see recipe cost</div>';
    return;
  }
  const matHtml = entries.map(([item, info]) => {
    const qty = info.qty || 0;
    const have = INV_TOTAL[item] || 0;
    const cls = have < qty ? 'stat-val bad' : 'stat-val';
    return `<div class="gear-stat-item" title="${esc(displayName(item))} — need ${fmt(qty)}, have ${fmt(have)}"><div class="${cls}">${fmt(qty)}</div><div class="stat-label">${esc(displayName(item))}</div></div>`;
  }).join('');
  const cost = planCost(plan);
  const head = `<div class="gear-cost-head">Crafting <b>${plan._pieces}</b> equipped piece${plan._pieces === 1 ? '' : 's'} from scratch at ${esc(DESTINATION)}</div>`;
  const unknownNote = cost.anyUnknown
    ? '<div class="gear-cost-unknown">Some recipes or materials have no price data yet — the breakdown covers only the priced parts.</div>' : '';
  grid.innerHTML = matHtml + `<div class="gear-cost-breakdown">${head}${costBreakdown(cost, plan)}${unknownNote}</div>`;
}

// Production-colony strip: the destination decides the colony tax AND the CMG
// faction rebate, so the gear page surfaces it right next to the cost it changes.
function renderGearDest() {
  const sel = document.getElementById('gear-dest');
  const status = document.getElementById('gear-dest-status');
  if (!sel || !status) return;
  if (!sel.options.length) {
    colonyList().forEach(c => {
      const o = document.createElement('option');
      o.value = c; o.textContent = c;
      sel.appendChild(o);
    });
  }
  if (sel.value !== DESTINATION) sel.value = DESTINATION;

  const own = COLONY_OWNER[DESTINATION];
  const rate = typeof COLONY_TAX[DESTINATION] === 'number' ? COLONY_TAX[DESTINATION] : 0;
  const factions = (DATA._reference && DATA._reference.factions) || {};
  const ownerName = own ? (factions[own] || own) : 'owner not set';
  const activeFaction = activeFactionId();
  const activeFactionName = window.factionById?.(activeFaction)?.name || activeFaction;
  const ownedByActive = own === activeFaction && activeFactionReturnRate() > 0;
  const taxTxt = rate > 0 ? rate + '% tax' : '0% tax';

  let forfeit = 0;
  try {
    const cost = planCost(computeGearPlan());
    if (!ownedByActive && cost && cost.total > 0.005) forfeit = cost.total * activeFactionReturnRate();
  } catch (e) { /* unpriced set — show the plain warning */ }

  const ours = Object.entries(COLONY_OWNER)
    .filter(([, f]) => f === activeFaction).map(([c]) => c).sort();

  status.innerHTML = ownedByActive
    ? `<div class="gear-dest-ok">✔ <b>${esc(DESTINATION)}</b> · ${esc(ownerName)} · ${taxTxt} — configured ${Math.round(activeFactionReturnRate() * 100)}% ${esc(activeFactionName)} return.</div>`
    : `<div class="gear-dest-warn">⚠ <b>${esc(DESTINATION)}</b> · ${esc(ownerName)} · ${taxTxt} — no configured ${esc(activeFactionName)} return for this colony.` +
      (forfeit > 0.005 ? ` Producing this set here misses ~<b>${fmtUC(forfeit)} UC</b> in potential faction return.` : '') +
      (ours.length ? ` Switch to ${ours.map(c => esc(c)).join(' or ')} to use configured ${esc(activeFactionName)} return.` : '') +
      '</div>';
}

function wireGearDest() {
  const sel = document.getElementById('gear-dest');
  if (!sel || sel._wired) return;
  sel._wired = true;
  sel.onchange = () => {
    DESTINATION = sel.value;
    saveDestination();
    // Keep the Calculator's destination dropdown in sync.
    const cd = document.getElementById('calc-dest');
    if (cd) cd.value = sel.value;
    renderGearDest();
    renderGearCost();
  };
}

function showGearPicker(slotName, armorType) {
  const overlay = document.getElementById('gear-picker-overlay');
  const title = document.getElementById('gear-picker-title');
  const body = document.getElementById('gear-picker-items');
  const factionSel = document.getElementById('gear-picker-faction');
  if (!overlay || !body) return;

  const slotType = (document.querySelector('[data-slot="' + slotName + '"]')?.dataset?.slotType) || 'armor';
  const slotCat = document.querySelector('[data-slot="' + slotName + '"]')?.dataset?.category || 'Armor';
  // Implants & Electronics live in specific armour slots rather than a share of
  // every armour list. Classic FoM slot table agrees: Resistance Amp - Legs,
  // Stamina Amp - Torso, Shield Implant - Torso. Shoulder Lamp rides on the
  // shoulder, Resistance Amp on the legs, Stamina Amplification on the chest.
  const IMPLANT_SLOTS = {
    ShoulderPads: ['Shoulder Lamp'],
    LegPads: ['Resistance Amp'],
    TorsoArmor: ['Stamina Amplification'],
  };
  let items;
  if (slotType === 'armor') {
    items = [...new Set([
      ...armorItemsByType(armorType),
      ...(IMPLANT_SLOTS[slotName] || []).filter(name => ALL_ITEMS.has(name)),
    ])];
  } else {
    // Filter by category for implants/boosters/medikit
    items = DATA.recipes.filter(r => r.output.category === slotCat && ALL_ITEMS.has(r.output.item)).map(r => r.output.item);
  }
  if (!items.length) { items = []; } // guard
  title.textContent = `Select ${slotName.replace(/-/g,' ').replace(/\w/g,c=>c.toUpperCase())}`;

  const factionOf = name => {
    const recipe = DATA.recipes.find(r => r.output.item === name);
    return recipe ? recipe._faction || '' : '';
  };

  if (factionSel) {
    const factions = [...new Set(items.map(factionOf).filter(Boolean))].sort();
    factionSel.innerHTML = '<option value="">All factions</option>' +
      factions.map(f => `<option value="${esc(f)}">${esc(f)}</option>`).join('');
    factionSel.value = '';
  }

  function renderItemList(factionFilter) {
    // Anything not live in the game is dropped outright — offering a piece
    // nobody can obtain is worse than leaving a gap in the list.
    let filtered = items.filter(name => !armorNotInGame(name));
    if (factionFilter) filtered = filtered.filter(name => factionOf(name) === factionFilter);
    // An armour slot also offers implants, which have no weight class and never
    // will. They must not be swept up as "unclassified" — that reads as missing
    // data about armour when it is simply a different kind of item.
    const isArmor = name => (DATA.recipes.find(r => r.output.item === name) || {}).output?.category === 'Armor';
    const weightFilter = document.getElementById('gear-picker-weight')?.value || '';
    if (weightFilter === '?') filtered = filtered.filter(name => isArmor(name) && !armorWeightOf(name));
    else if (weightFilter) filtered = filtered.filter(name => armorWeightOf(name) === weightFilter);
    // Search filter
    const searchQ = (document.getElementById('gear-picker-search')?.value || '').toLowerCase();
    if (searchQ) filtered = filtered.filter(name => name.toLowerCase().includes(searchQ));

    // Cost every candidate once, then sort. Priced from scratch at the current
    // destination so taxes, mine sites, slot levels and drift all count.
    const costs = {};
    filtered.forEach(name => { costs[name] = unitCost(name); });
    const cheapestNet = Math.min(...filtered.map(n => costs[n].net == null ? Infinity : costs[n].net));

    const sortBy = document.getElementById('gear-picker-sort')?.value;
    if (sortBy === 'net' || sortBy === 'total') {
      filtered.sort((a, b) => {
        const va = costs[a][sortBy], vb = costs[b][sortBy];
        if (va == null && vb == null) return a.localeCompare(b);
        if (va == null) return 1;            // unpriced sinks, never leads
        if (vb == null) return -1;
        return va - vb || a.localeCompare(b);
      });
    } else if (sortBy && sortBy !== 'name') {
      filtered.sort((a,b) => {
        const ra = DATA.recipes.find(r => r.output.item === a);
        const rb = DATA.recipes.find(r => r.output.item === b);
        return (rb?.output?.stats?.[sortBy]||0) - (ra?.output?.stats?.[sortBy]||0);
      });
    } else if (sortBy === 'name') {
      filtered.sort((a,b) => a.localeCompare(b));
    }
    body.innerHTML = filtered.map(name => {
      const c = costs[name];
      const w = armorWeightOf(name);
      const best = c.net != null && c.net === cheapestNet && filtered.length > 1;

      // Every figure here is PER PIECE. A run makes three, and quoting the run
      // total beside one piece's name read as that piece's price.
      // Label above the figure, not below it — read top to bottom you get
      // "costs CMG / 1,218" rather than a number whose meaning arrives late.
      let costHtml;
      if (c.total == null) {
        costHtml = '<div class="gpi-cost unknown">no price</div>';
      } else {
        const sub = c.rebate > 0.005
          ? `pay ${fmtUC(c.total)} · ${fmtUC(c.rebate)} back`
          : `nothing back at ${esc(DESTINATION)}`;
        const run = c.perRun > 1
          ? `<span class="gpi-cost-run">${fmtUC(c.runNet)} per run of ${c.perRun}</span>` : '';
        costHtml = `<div class="gpi-cost${best ? ' best' : ''}">
             <span class="gpi-cost-lbl">costs ${esc(window.factionById?.(activeFactionId())?.name || activeFactionId())} · each</span>
             <span class="gpi-net">${fmtUC(c.rebate > 0.005 ? c.net : c.total)}${c.unknown ? '+' : ''}</span>
             <span class="gpi-cost-sub">${sub}</span>
             ${run}
           </div>`;
      }

      const cls = w ? `<span class="gpi-w gpi-w-${w.toLowerCase()}">${w}</span>`
                    : (!isArmor(name) ? '<span class="gpi-w gpi-w-unknown">implant</span>'
                    : (armorClassNA(name) ? '<span class="gpi-w gpi-w-unknown">no class</span>'
                                          : '<span class="gpi-w gpi-w-unknown">unclassified</span>'));
      // Cost sentence moved out of a native title (browser text tooltip that
      // stacked over the custom one) into the hover tooltip as data-cost-tip.
      const costTip = c.total != null
        ? (c.perRun > 1
            ? `A run at ${esc(DESTINATION)} makes ${c.perRun} and costs ${fmtUC(c.runTotal)} UC, so ${fmtUC(c.total)} per piece`
            : `Making one at ${esc(DESTINATION)} costs ${fmtUC(c.total)} UC`)
          + (c.rebate > 0
              ? `. ${fmtUC(c.rebate)} per piece returns to ${window.factionById?.(activeFactionId())?.name || activeFactionId()} funds, leaving the faction down ${fmtUC(c.net)} each`
              : `, and none returns to ${window.factionById?.(activeFactionId())?.name || activeFactionId()} funds because ${esc(DESTINATION)} is not owned by the active faction`)
          + '.'
        : '';
      return `<div class="gear-picker-item${best ? ' gpi-best' : ''}" data-item="${encodeURIComponent(name)}"${
          costTip ? ` data-cost-tip="${esc(costTip)}"` : ''}>
        <div class="gpi-icon">${iconFor(name)}</div>
        <div class="gpi-main"><div class="gpi-name">${esc(displayName(name))}</div>
          <div class="gpi-faction">${esc(factionOf(name))} · ${cls}${
            best ? ' <span class="gpi-tag">cheapest</span>' : ''}</div></div>
        ${costHtml}
      </div>`;
    }).join('') || '<div class="muted" style="padding:1rem">No items found for this slot/faction/weight.</div>';

    body.querySelectorAll('.gear-picker-item').forEach(el => {
      el.addEventListener('click', () => {
        const item = decodeURIComponent(el.dataset.item);
        const slotEl = document.querySelector('[data-slot="' + slotName + '"]');
        const st = slotEl?.dataset?.slotType || 'armor';
        if (st === 'armor') { GEAR[slotName] = item; saveGear(GEAR); }
        else if (st === 'booster') { BOOSTERS[parseInt(slotName.split('-')[1])] = item; saveBoosters(); }
        else if (st === 'medikit') { MEDIKIT = item; saveMedikit(); }
        renderGear(); renderGearSets();
        overlay.hidden = true;
      });
    });
  }

  renderItemList('');
  // Assigned rather than addEventListener: this function runs again every time
  // the picker opens, and listeners were stacking up one re-render per open.
  const rerun = () => renderItemList(factionSel?.value || '');
  if (factionSel) factionSel.onchange = rerun;
  const weightSel = document.getElementById('gear-picker-weight');
  if (weightSel) weightSel.onchange = rerun;
  const searchEl = document.getElementById('gear-picker-search');
  if (searchEl) searchEl.oninput = rerun;
  const sortEl = document.getElementById('gear-picker-sort');
  if (sortEl) sortEl.onchange = rerun;

  // Tooltip on gear picker items — shows diff vs equipped + cost + materials
  body.addEventListener('mouseover', e => {
    const el = e.target.closest('.gear-picker-item');
    if (!el || !el.dataset.item) return;
    const item = decodeURIComponent(el.dataset.item);
    const recipe = DATA.recipes.find(r => r.output.item === item);
    const newStats = recipe?.output?.stats;
    const costTip = el.dataset.costTip || '';
    if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
    if (!newStats && !costTip) return;
    var oldStats = {};
    var equipped = GEAR[slotName];
    if (equipped) {
      var eqRecipe = DATA.recipes.find(function(r){return r.output.item === equipped;});
      if (eqRecipe?.output?.stats) oldStats = eqRecipe.output.stats;
    }
    var allKeys = newStats ? Object.keys(Object.assign({}, oldStats, newStats)) : [];
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'item-tooltip';
    var html = '<div class="tt-name">' + esc(item) + '</div>';
    if (equipped) {
      html += '<div class="tt-equipped">vs ' + esc(equipped) + '</div>';
    }
    allKeys.forEach(function(k) {
      var nv = newStats[k] != null ? newStats[k] : 0;
      var ov = oldStats[k] != null ? oldStats[k] : 0;
      var diff = nv - ov;
      var label = STAT_LABELS[k] || k.substring(0,4);
      var nvStr = (nv > 0 ? '+' : '') + nv;
      if (equipped && diff !== 0) {
        var arrow = diff > 0 ? '▲' : '▼';
        var sign = diff > 0 ? '+' : '';
        var cls = diff > 0 ? 'tt-gain' : 'tt-loss';
        html += '<div class="tt-stat"><span class="tt-label">' + label + '</span><span class="tt-old">' + (ov>0?'+':'') + ov + '</span><span class="tt-arrow">→</span><span class="tt-new">' + nvStr + '</span><span class="' + cls + '">' + arrow + sign + diff + '</span></div>';
      } else {
        html += '<div class="tt-stat"><span class="tt-label">' + label + '</span><span class="tt-new">' + nvStr + '</span></div>';
      }
    });
    if (costTip) html += '<div class="tt-cost">' + costTip + '</div>';
    html += tooltipMaterialsHtml(item);
    tooltipEl.innerHTML = html;
    document.body.appendChild(tooltipEl);
    var rect = el.getBoundingClientRect();
    tooltipEl.style.left = Math.min(rect.right + 6, window.innerWidth - tooltipEl.offsetWidth - 8) + 'px';
    tooltipEl.style.top = Math.min(rect.top, window.innerHeight - tooltipEl.offsetHeight - 8) + 'px';
  });
  body.addEventListener('mouseleave', () => {
    if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
  });

  overlay.hidden = false;
}

function renderGearSets() {
  const list = document.getElementById('gear-sets-list');
  if (!list) return;
  if (!SHARED_GEAR.length) {
    list.innerHTML = '<div class="gear-sets-head">Guild Gear Library</div><div class="muted" style="font-size:0.6875rem;padding:0.25rem 0">No shared sets yet — equip armor and Save Gear Set to publish one.</div>';
    return;
  }
  const me = PLAYERS.active || 'anonymous';
  const sorted = SHARED_GEAR.slice().sort((a, b) =>
    gearSetScore(b) - gearSetScore(a) || (b.created_at || 0) - (a.created_at || 0));
  list.innerHTML = '<div class="gear-sets-head">Guild Gear Library</div>' + sorted.map(s => {
    const count = Object.keys(s.gear || {}).length;
    const score = gearSetScore(s);
    const myVote = (s.votes || {})[me] || 0;
    return `<div class="gear-set-item">
      <div class="gs-votes">
        <button data-gear-vote="${s.id}" data-dir="1" class="gs-vote up ${myVote === 1 ? 'active' : ''}" title="Upvote">▲</button>
        <span class="gs-score ${score > 0 ? 'pos' : score < 0 ? 'neg' : ''}">${score}</span>
        <button data-gear-vote="${s.id}" data-dir="-1" class="gs-vote down ${myVote === -1 ? 'active' : ''}" title="Downvote">▼</button>
      </div>
      <div class="gs-info">
        <span class="set-name">${esc(s.name)}</span>
        <span class="set-meta">${count} pieces · by ${esc(s.owner || '?')}</span>
        ${(function(){
          var totals = {};
          Object.keys(s.gear||{}).forEach(function(slot) {
            var r = DATA.recipes.find(function(rr){return rr.output.item === s.gear[slot];});
            if (r && r.output && r.output.stats && r.output.category === 'Armor') {
              Object.entries(r.output.stats).forEach(function(e) {
                var k = e[0], v = e[1];
                if (typeof v === 'number') totals[k] = (totals[k]||0) + v;
              });
            }
          });
          var keys = ['armor','shielding','endurance','resistance','reflection','agility'];
          var parts = [];
          keys.forEach(function(k) {
            if (totals[k] != null && totals[k] !== 0) {
              var label = (STAT_LABELS[k]||k.substring(0,3));
              parts.push('<span class="gs-stat">' + label + ' <b>' + (totals[k]>0?'+':'') + Math.round(totals[k]*10)/10 + '</b></span>');
            }
          });
          return parts.length ? '<div class="gs-stats">' + parts.join('') + '</div>' : '';
        })()}
      </div>
      <div class="gs-actions">
        <button data-gear-load="${s.id}" class="ghost">Load</button>
        <button data-gear-del="${s.id}" class="ghost" style="color:var(--bad)" title="Delete this local preset">×</button>
      </div>
    </div>`;
  }).join('');
  const findSet = id => SHARED_GEAR.find(s => s.id === id);
  list.querySelectorAll('[data-gear-load]').forEach(b => {
    b.addEventListener('click', () => {
      const s = findSet(b.dataset.gearLoad);
      if (s) { GEAR = { ...s.gear }; saveGear(GEAR); renderGear(); toast(`Loaded gear set "${s.name}".`); }
    });
  });
  list.querySelectorAll('[data-gear-del]').forEach(b => {
    b.addEventListener('click', () => {
      const s = findSet(b.dataset.gearDel);
      if (!s) return;
      SHARED_GEAR = SHARED_GEAR.filter(x => x.id !== s.id);
      renderGearSets();
      syncShared('gear', [{ op: 'delete', id: s.id }]);
      toast(`Deleted "${s.name}" from local presets.`);
    });
  });
  list.querySelectorAll('[data-gear-vote]').forEach(b => {
    b.addEventListener('click', () => {
      const s = findSet(b.dataset.gearVote);
      if (!s) return;
      const dir = parseInt(b.dataset.dir, 10);
      const cur = (s.votes || {})[me] || 0;
      const next = cur === dir ? 0 : dir; // clicking your own vote clears it
      s.votes = s.votes || {};
      if (next === 0) delete s.votes[me]; else s.votes[me] = next;
      renderGearSets();
      syncShared('gear', [{ op: 'vote', id: s.id, voter: me, dir: next }]);
    });
  });
}


// ═══════════════════════════════════════════════════════════════════════════
// § LOCAL DATA — gear sets, inventory, and colony settings
// ═══════════════════════════════════════════════════════════════════════════

const LOCAL_SHARED_KEY = 'er_calculator_shared_v1';
let SHARED_GEAR = [];   // [{id, name, gear:{slot:item}, owner, created_at, votes:{player:±1}}]
let SHARED_INV = {};    // local browser snapshot: {playerName: entries[]}
let SYNC_SAVING = false;
const SYNC_PENDING = { gear: [], inventory: [], taxes: [] };
let TAXES_SEEDED = false;

function localId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function storageStatus(msg) {
  const el = document.getElementById('gear-sync-status');
  if (el) el.textContent = msg;
}

// Adopt remote inventories: other players' data always wins; the active
// player's data is only adopted when we have no local edit waiting to push.
// Players present in the previous shared snapshot but now gone were removed
// by another workspace participant — drop them locally too so deletions propagate.
function adoptRemoteInventory(remote) {
  if (!remote || typeof remote !== 'object') return;
  const prev = SHARED_INV;
  SHARED_INV = remote;
  let changed = false;
  Object.keys(prev).forEach(name => {
    if (name in remote || !(name in PLAYERS.players)) return;
    if (name === PLAYERS.active && (INV_PUSH_TIMER || SYNC_PENDING.inventory.length)) return;
    delete PLAYERS.players[name];
    if (PLAYERS.active === name) PLAYERS.active = Object.keys(PLAYERS.players)[0] || '';
    changed = true;
  });
  Object.entries(remote).forEach(([name, entries]) => {
    if (!Array.isArray(entries)) return;
    if (name === PLAYERS.active && (INV_PUSH_TIMER || SYNC_PENDING.inventory.length)) return;
    if (JSON.stringify(PLAYERS.players[name] || null) !== JSON.stringify(entries)) {
      PLAYERS.players[name] = entries.map(e => ({ ...e }));
      changed = true;
    }
  });
  // Fold legacy location spellings before they land in local storage.
  if (window.STORE && window.STORE.migrateLocationNames &&
      window.STORE.migrateLocationNames(PLAYERS)) changed = true;
  // A remote inventory can be the first source of players in a fresh browser.
  // Select one explicitly; otherwise the native <select> displays its first
  // option while PLAYERS.active remains empty.
  if (!PLAYERS.active && Object.keys(PLAYERS.players).length &&
      window.STORE && window.STORE.ensureActivePlayer) {
    window.STORE.ensureActivePlayer();
    changed = true;
  }
  if (changed) {
    savePlayersLocal(PLAYERS);
    recomputeInv();
    // A remote player can change the active application context, not just the
    // inventory table. Use the common refresh path so the selector, footer,
    // destinations, picker, and calculator empty state stay consistent.
    refreshAll();
  }
}

// One-time upload of local players that don't exist in the shared store yet.
// Once-per-browser (localStorage flag), NOT once-per-session: re-running every
// boot resurrected players that had been deliberately removed from the shared
// store by any client that still held a stale local copy. New players created
// after this point are pushed by the savePlayers() hook instead.
function migrateLocalInventory(remote) {
  try {
    if (localStorage.getItem('cmg_inv_migrated_v1')) return;
    localStorage.setItem('cmg_inv_migrated_v1', '1');
  } catch (e) { return; }
  const ops = [];
  Object.entries(PLAYERS.players).forEach(([name, entries]) => {
    if (!(name in remote) && Array.isArray(entries)) ops.push({ op: 'setplayer', name, entries });
  });
  if (ops.length) syncShared('inventory', ops);
}

async function loadShared() {
  if (SYNC_SAVING) return;
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_SHARED_KEY) || '{}');
    SHARED_GEAR = Array.isArray(saved.gear) ? saved.gear : [];
    const localInventory = saved.inventory && typeof saved.inventory === 'object' ? saved.inventory : {};
    adoptRemoteInventory(localInventory);
    SHARED_INV = localInventory;
    if (saved.taxes && typeof saved.taxes === 'object') adoptRemoteColonies(saved.taxes);
    renderGearSets();
    storageStatus('Local · ' + new Date().toLocaleTimeString());
  } catch (e) {
    storageStatus('Local storage unavailable');
  }
}

function localColoniesSnapshot() {
  const out = {};
  if (typeof colonyList === 'function') {
    colonyList().forEach(colony => {
      out[colony] = { rate: COLONY_TAX[colony] || 0, owner: COLONY_OWNER[colony] || '' };
    });
  }
  return out;
}

function applyLocalColonyOp(op) {
  if (!op || !op.colony) return;
  const remote = { [op.colony]: { rate: op.rate, owner: op.owner } };
  adoptRemoteColonies(remote);
}

function persistShared() {
  try {
    localStorage.setItem(LOCAL_SHARED_KEY, JSON.stringify({
      gear: SHARED_GEAR,
      inventory: SHARED_INV,
      taxes: localColoniesSnapshot(),
    }));
  } catch (e) {
    storageStatus('Local storage full');
  }
}

// Apply operations locally. The same data model remains available offline;
// optional server synchronization can be added later without changing UI code.
function syncShared(file, ops) {
  if (!ops.length) return;
  if (file === 'gear') {
    for (const op of ops) {
      if (op.op === 'delete') SHARED_GEAR = SHARED_GEAR.filter(s => s.id !== op.id);
      if (op.op === 'upsert') {
        const i = SHARED_GEAR.findIndex(s => s.id === op.set?.id);
        if (i >= 0) SHARED_GEAR[i] = op.set; else SHARED_GEAR.push(op.set);
      }
      if (op.op === 'vote') {
        const set = SHARED_GEAR.find(s => s.id === op.id);
        if (set) { set.votes = set.votes || {}; if (op.dir) set.votes[op.voter] = op.dir; else delete set.votes[op.voter]; }
      }
    }
    renderGearSets();
  } else if (file === 'inventory') {
    for (const op of ops) {
      if (op.op === 'setplayer') SHARED_INV[op.name] = op.entries;
      if (op.op === 'delplayer') delete SHARED_INV[op.name];
    }
  } else if (file === 'taxes') {
    for (const op of ops) if (op.colony) applyLocalColonyOp(op);
  }
  persistShared();
  storageStatus('Saved locally · ' + new Date().toLocaleTimeString());
}

// Debounced push of the active player's inventory after local edits.
let INV_PUSH_TIMER = null;
function schedulePushInv() {
  const name = PLAYERS.active;
  if (!name) return;
  if (INV_PUSH_TIMER) clearTimeout(INV_PUSH_TIMER);
  INV_PUSH_TIMER = setTimeout(() => {
    INV_PUSH_TIMER = null;
    // Read the CAPTURED player's entries, not the currently-active player's:
    // switching players inside the debounce window used to push player B's
    // inventory under player A's name (cross-player data corruption).
    if (!(name in PLAYERS.players)) return; // removed while pending
    const entries = (PLAYERS.players[name] || []).map(e => ({ ...e }));
    // Skip the push when nothing differs from the shared store (e.g. player switch).
    if (JSON.stringify(SHARED_INV[name] || null) === JSON.stringify(entries)) return;
    SHARED_INV[name] = entries;
    syncShared('inventory', [{ op: 'setplayer', name, entries }]);
  }, 1200);
}

// Names for local gear owners: local players plus anyone seen in the
// shared requests (so participant names propagate across browsers).
function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 604800) return Math.floor(s / 86400) + 'd ago';
  return new Date(ts).toLocaleDateString();
}
