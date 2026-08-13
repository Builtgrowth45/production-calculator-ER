/**
 * src/app-init.js — Application initialisation
 * ============================================================================
 * DOMContentLoaded event wiring for all tabs. Loaded LAST — every view file
 * and app-core.js must be loaded before this so all function references resolve.
 */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  renderItemOptions();
  const edl = document.getElementById('inv-item-list');
  ALL_ITEMS.forEach(name => { const o = document.createElement('option'); o.value = name; edl.appendChild(o); });
  const rdl = document.getElementById('req-item-list');
  if (rdl) ALL_ITEMS.forEach(name => { const o = document.createElement('option'); o.value = name; rdl.appendChild(o); });
  initPickerFilters();
  refreshAll();
  renderPicker();
  initHelpView();
  initAcademyView();
  initBalanceBrowser();
  wireModelsEvents();
  wireCharacterStudioEvents();

  // Tabs
  // Register on each button individually AND as a delegated handler on nav
  document.querySelectorAll('.tab').forEach(t => {
    t.setAttribute('role', 'tab');
    t.addEventListener('click', () => {
      setView(t.dataset.view);
      document.querySelectorAll('.tab').forEach(x => x.setAttribute('aria-selected', 'false'));
      t.setAttribute('aria-selected', 'true');
      syncMoreButton();
    });
  });
  // Delegated fallback — catches clicks on tab button children
  document.querySelector('nav').addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    setView(tab.dataset.view);
    document.querySelectorAll('.tab').forEach(x => x.setAttribute('aria-selected', 'false'));
    tab.setAttribute('aria-selected', 'true');
    syncMoreButton();
  });
  document.querySelector('.tab.active')?.setAttribute('aria-selected', 'true');

  // Grouped navigation v2 is opt-in; it delegates to the same setView lifecycle
  // as the legacy tabs so hooks, analytics, and deep links remain unchanged.
  const navV2 = document.getElementById('nav-v2');
  const navV2Drawer = document.getElementById('nav-v2-drawer');
  const navV2DrawerToggle = navV2?.querySelector('[data-nav-toggle="drawer"]');
  function syncNavV2(view) {
    if (!navV2) return;
    navV2.querySelectorAll('[data-nav-view]').forEach(button => {
      const active = button.dataset.navView === view;
      button.classList.toggle('active', active);
      button.setAttribute('aria-current', active ? 'page' : 'false');
      button.tabIndex = active ? 0 : -1;
    });
  }
  function closeNavV2Drawer(restoreFocus = false) {
    if (!navV2Drawer) return;
    navV2Drawer.hidden = true;
    navV2DrawerToggle?.setAttribute('aria-expanded', 'false');
    if (restoreFocus) navV2DrawerToggle?.focus();
  }
  window.syncCMGNavV2 = syncNavV2;
  if (navV2) {
    navV2.querySelectorAll('[data-nav-view]').forEach(button => {
      button.setAttribute('aria-current', 'false');
      button.tabIndex = -1;
    });
    navV2.addEventListener('click', e => {
      const toggle = e.target.closest('[data-nav-toggle]');
      if (toggle) {
        if (toggle.dataset.navToggle === 'drawer') {
          navV2Drawer.hidden = false;
          toggle.setAttribute('aria-expanded', 'true');
          navV2Drawer.querySelector('[data-nav-toggle="close"]')?.focus();
        } else closeNavV2Drawer(true);
        return;
      }
      const button = e.target.closest('[data-nav-view]');
      if (!button) return;
      setView(button.dataset.navView);
      closeNavV2Drawer();
    });
    navV2.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeNavV2Drawer(true); return; }
      if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
      const buttons = [...navV2.querySelectorAll('[data-nav-view]')].filter(b => !b.closest('[hidden]'));
      const current = buttons.indexOf(document.activeElement);
      if (current < 0) return;
      e.preventDefault();
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 :
        (current + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next].focus();
    });
    syncNavV2(document.querySelector('.view.active')?.id.replace('view-', '') || 'calc');
  }

  // "More ▾" overflow dropdown holding the Reference sections.
  const moreWrap = document.querySelector('.nav-more');
  const moreBtn  = document.querySelector('.nav-more-btn');
  const moreMenu = document.getElementById('nav-more-menu');
  function syncMoreButton() {
    if (!moreBtn || !moreMenu) return;
    // Reflect whichever Reference section is active on the button itself, so
    // the user still sees "you are here" when the active tab is tucked away.
    const activeRef = moreMenu.querySelector('.tab.active');
    moreBtn.classList.toggle('active', !!activeRef);
    const lbl = moreBtn.querySelector('.more-label');
    if (lbl) lbl.textContent = activeRef ? activeRef.textContent.trim() : 'More';
  }
  if (moreBtn && moreMenu) {
    const closeMore = () => { moreMenu.hidden = true; moreBtn.setAttribute('aria-expanded', 'false'); };
    const openMore  = () => { moreMenu.hidden = false; moreBtn.setAttribute('aria-expanded', 'true'); };
    moreBtn.addEventListener('click', e => {
      e.stopPropagation();
      moreMenu.hidden ? openMore() : closeMore();
    });
    moreMenu.addEventListener('click', e => { if (e.target.closest('.tab')) closeMore(); });
    document.addEventListener('click', e => { if (!moreWrap.contains(e.target)) closeMore(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMore(); });
    syncMoreButton();
  }

  // Auto-overflow: keep the Main tabs on ONE row. Whichever don't fit get moved
  // into the "More" menu (ahead of the Reference sections) rather than making
  // the bar scroll sideways. Re-runs on resize and after web fonts settle.
  const navBar  = document.querySelector('.nav-bar');
  const mainNav = navBar && navBar.querySelector(':scope > nav');
  if (navBar && mainNav && moreMenu) {
    const mainTabs = Array.from(mainNav.children); // the 9 Main tabs, in order
    function fitTabs() {
      mainTabs.forEach(t => mainNav.appendChild(t)); // restore all to the strip
      let guard = 0;
      while (mainNav.scrollWidth > mainNav.clientWidth + 1 &&
             mainNav.children.length > 1 && guard++ < 40) {
        // move the last still-fitting Main tab to the front of the menu
        moreMenu.insertBefore(mainNav.lastElementChild, moreMenu.firstElementChild);
      }
      syncMoreButton();
    }
    fitTabs();
    let raf;
    window.addEventListener('resize', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fitTabs);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTabs);
  }

  // Calculator
  document.getElementById('calc-run').addEventListener('click', runCalculator);
  document.getElementById('calc-qty').addEventListener('keydown', e => { if (e.key === 'Enter') runCalculator(); });
  document.getElementById('calc-dest').addEventListener('change', () => { getDestination(); if (CALC_TRAY.length) runMultiPlan(); });
  // Re-plan immediately when "Plan from scratch" is toggled, if a plan is up.
  document.getElementById('calc-scratch')?.addEventListener('change', () => {
    const item = document.getElementById('calc-item').value.trim();
    if (item && ALL_ITEMS.has(item)) runCalculator();
  });
  document.getElementById('calc-add').addEventListener('click', () => addToTray());
  document.getElementById('calc-save')?.addEventListener('click', saveCurrentPlan);
  document.getElementById('calc-runmulti').addEventListener('click', runMultiPlan);
  // Refinement-path pickers live in the controls (above results).
  // calc-item is now readonly — paths refresh at end of runCalculator().
  // Delegated on #calc-result (calc-paths is recreated on every renderPlan).
  document.getElementById('calc-result').addEventListener('change', e => {
    if (!e.target.closest('#calc-paths')) return;
    const sel = e.target.closest('select[data-alt]');
    if (!sel) return;
    ALTERNATIVE_CHOICES[decodeURIComponent(sel.dataset.alt)] = parseInt(sel.value, 10);
    savePaths();
    // runCalculator() / runMultiPlan() will call renderCalcPaths() on the new DOM
    if (CALC_TRAY.length) runMultiPlan();
    else if (document.querySelector('#calc-result .plan-summary')) runCalculator();
  });
  renderCalcPaths();
  // Colonies tab: tax/owner edits, plus its filters.
  document.getElementById('col-grid')?.addEventListener('change', e => {
    const el = e.target.closest('[data-ct-tax], [data-ct-own]');
    if (el) onColonyTaxChange(el);
  });
  document.getElementById('col-search')?.addEventListener('input', () => renderColonies());
  document.getElementById('col-priced-only')?.addEventListener('change', () => renderColonies());
  registerViewHook({ view: 'colonies', fn: renderColonies });
  renderColonies();
  // Energy/cooling: 'input' keeps the readout live while dragging, 'change'
  // does the replan once the slider is let go rather than on every pixel.
  ['slot-energy', 'slot-cooling'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      const out = document.getElementById(id + '-out');
      if (out) out.textContent = (id === 'slot-energy' ? clampEnergy(el.value) : clampCooling(el.value));
    });
    el.addEventListener('change', () => onSlotLevelChange(el));
  });
  renderSlotLevels();
  document.getElementById('calc-cleartray').addEventListener('click', () => {
    CALC_TRAY = []; saveTray(); renderTray();
    document.getElementById('calc-multi').innerHTML = '';
    updateShareLink();
  });
  document.getElementById('tray-items').addEventListener('input', e => {
    const q = e.target.closest('input[data-tray-q]'); if (!q) return;
    const i = +q.dataset.trayQ; CALC_TRAY[i].qty = Math.max(1, parseInt(q.value, 10) || 1); saveTray();
  });
  document.getElementById('tray-items').addEventListener('click', e => {
    const x = e.target.closest('button[data-tray-x]'); if (!x) return;
    CALC_TRAY.splice(+x.dataset.trayX, 1); saveTray(); renderTray();
  });
  initTheme();
  renderTray();
  renderSavedPlans();
  // theme switcher buttons
  document.querySelectorAll('.theme-btn').forEach(b => {
    b.setAttribute('aria-pressed', b.classList.contains('active') ? 'true' : 'false');
    b.addEventListener('click', () => {
      applyTheme(b.dataset.theme);
      document.querySelectorAll('.theme-btn').forEach(x => x.setAttribute('aria-pressed', x.classList.contains('active') ? 'true' : 'false'));
    });
  });
  // mute button — reflect the saved state, since it persists across sessions
  renderMuteButton();
  // font-size slider
  const sizeSlider = document.getElementById('size-range');
  if (sizeSlider) {
    sizeSlider.addEventListener('input', () => applyFontScale(sizeSlider.value));
  }

  // collapsible section titles (delegated)
  document.getElementById('calc-result').addEventListener('click', e => {
    const cb = e.target.closest('.transfer-cb');
    if (cb) { toggleTransferCheck(cb); return; }
    const ob = e.target.closest('.obtain-cb');
    if (ob) { toggleObtainCheck(ob); return; }
    const pick = e.target.closest('.mine-pick');
    if (pick) { pickObtainSite(pick); return; }
    const src = e.target.closest('.src-pick');
    if (src) { pickTransportSource(src); return; }
    const mine = e.target.closest('.mine-log');
    if (mine) { logMined(decodeURIComponent(mine.dataset.mine), mine.dataset.qty); return; }
    const title = e.target.closest('.section-title');
    if (title) { toggleSection(title); return; }
  });
  document.getElementById('calc-multi').addEventListener('click', e => {
    const cb = e.target.closest('.transfer-cb');
    if (cb) { toggleTransferCheck(cb); return; }
    const ob = e.target.closest('.obtain-cb');
    if (ob) { toggleObtainCheck(ob); return; }
    const pick = e.target.closest('.mine-pick');
    if (pick) { pickObtainSite(pick); return; }
    const src = e.target.closest('.src-pick');
    if (src) { pickTransportSource(src); return; }
    const mine = e.target.closest('.mine-log');
    if (mine) { logMined(decodeURIComponent(mine.dataset.mine), mine.dataset.qty); return; }
    const title = e.target.closest('.section-title');
    if (title) { toggleSection(title); return; }
  });
  // Custom mined amount — Enter logs it, so a full row never needs the mouse.
  ['calc-result', 'calc-multi'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      const q = e.target.closest('.mine-qty');
      if (!q || e.key !== 'Enter') return;
      e.preventDefault();
      logMined(decodeURIComponent(q.dataset.mineQty), q.value);
    });
  });
  // Keyboard support for the collapsible section headers (role=button).
  ['calc-result', 'calc-multi'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const title = e.target.closest('.section-title');
      if (title) { e.preventDefault(); toggleSection(title); }
    });
  });

  // Picker
  document.getElementById('picker-cat').addEventListener('change', renderPicker);
  document.getElementById('picker-grid').addEventListener('click', e => {
    const card = e.target.closest('.pick-card');
    if (!card) return;
    const item = decodeURIComponent(card.dataset.item);
    document.getElementById('calc-item').value = item;
    runCalculator();
  });
  // Quick-stats tooltip on hover (shared across picker + gear slots)
  document.getElementById('picker-grid').addEventListener('mouseover', e => {
    const card = e.target.closest('.pick-card');
    if (!card) return;
    if (tooltipEl) tooltipEl.remove();
    const item = decodeURIComponent(card.dataset.item);
    const recipe = DATA.recipes.find(r => r.output.item === item);
    if (!recipe?.output?.stats) return;
    const stats = recipe.output.stats;
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'item-tooltip';
    tooltipEl.innerHTML = `<div class="tt-name">${esc(item)}</div>` +
      Object.entries(stats).slice(0, 6).map(([k,v]) =>
        `<div class="tt-stat"><span class="tt-label">${STAT_LABELS[k]||k}</span><span class="tt-val">${v>0?'+':''}${v}</span></div>`
      ).join('') + tooltipMaterialsHtml(item);
    document.body.appendChild(tooltipEl);
    const rect = card.getBoundingClientRect();
    tooltipEl.style.left = Math.min(rect.right + 6, window.innerWidth - tooltipEl.offsetWidth - 8) + 'px';
    tooltipEl.style.top = Math.min(rect.top, window.innerHeight - tooltipEl.offsetHeight - 8) + 'px';
  });
  document.getElementById('picker-grid').addEventListener('mouseleave', () => {
    if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
  }, true);
  // Enter on picker search runs first match
  document.getElementById('picker-search').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const first = document.querySelector('.pick-card');
      if (first) { first.click(); e.preventDefault(); }
    }
  });

  // Search inputs
  ['picker-search', 'inv-search', 'items-search'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      if (id === 'picker-search') renderPicker();
      if (id === 'inv-search') renderInventory();
      if (id === 'items-search') renderItems();
    });
  });
  document.getElementById('inv-materials-only')?.addEventListener('change', renderInventory);
  // Screenshot import: button click and clipboard paste
  document.getElementById('inv-scan-shot')?.addEventListener('click', function() {
    var input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = function(e) { if (e.target.files[0]) handleScreenshotUpload(e.target.files[0]); };
    input.click();
  });
  document.addEventListener('paste', handleScreenshotPaste);

  // Weapon sort
  document.getElementById('weapon-sort').addEventListener('change', renderWeapons);
  document.getElementById('drug-sort').addEventListener('change', renderDrugs);
  document.getElementById('drug-search').addEventListener('input', renderDrugs);
  document.getElementById('bn-search').addEventListener('input', renderBattleNodes);

  // apply-plan buttons (event delegation on calc result areas)
  document.getElementById('calc-result').addEventListener('click', e => {
    const btn = e.target.closest('.apply-plan');
    if (!btn || btn.disabled || !btn.dataset.apply) return;
    const item = decodeURIComponent(btn.dataset.apply);
    const qty = parseInt(btn.dataset.qty, 10);
    snapshotInv();
    const result = compute(item, qty, ALTERNATIVE_CHOICES, null, null, DESTINATION, getDiscounts());
    const log = applyPlan(result);
    ANALYTICS.track('apply_plan', { item });
    // Record it BEFORE re-rendering: runCalculator() replaces this button, so
    // setting its text here was pointless — the state has to survive the render.
    markPlanApplied(planSignature(item, qty));
    runCalculator();
    toast(`Plan applied. ${log.length} step(s) executed. Ctrl+Z to undo.`, 3000, 'success');
  });

  // Copy shopping list (single + multi)
  function copyShoppingList() {
    const result = CALC_TRAY.length
      ? compute(CALC_TRAY, ALTERNATIVE_CHOICES, Object.assign({}, INV_TOTAL), null, DESTINATION, getDiscounts()).plan
      : (() => { const item = document.getElementById('calc-item').value.trim();
          const qty = Math.max(1, parseInt(document.getElementById('calc-qty').value,10)||1);
          return compute(item, qty, ALTERNATIVE_CHOICES, null, null, DESTINATION, getDiscounts()).plan; })();
    const lines = [];
    Object.entries(result.transport).forEach(([n,info]) => {
      lines.push(`Move ${fmt(info.qty)} ${displayName(n)} → ${DESTINATION}`);
    });
    Object.entries(result.acquire).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([n,info]) => {
      const sites = (info.from||[]).join(', ');
      lines.push(`${fmt(info.qty)}× ${displayName(n)}${sites ? ' — ' + sites : ''}`);
    });
    result.steps.forEach(s => {
      lines.push(`Craft ${fmt(s.produced)} ${displayName(s.item)} (${s.batches} batch${s.batches>1?'es':''})`);
    });
    navigator.clipboard.writeText(lines.join('\n')).then(() => toast('Shopping list copied!', 3000, 'success'));
  }
  function sharePlanLink() {
    updateShareLink();
    navigator.clipboard.writeText(location.href)
      .then(() => toast('Share link copied — send it to another player.', 3000, 'success'))
      .catch(() => toast('Could not copy — copy the URL from the address bar.', 4000, 'error'));
  }
  ['calc-result', 'calc-multi'].forEach(id => {
    document.getElementById(id).addEventListener('click', e => {
      if (e.target.closest('.copy-list')) copyShoppingList();
      else if (e.target.closest('.share-plan')) sharePlanLink();
    });
  });

  // Recent-calculation chips
  renderRecent();
  document.getElementById('calc-recent')?.addEventListener('click', e => {
    const chip = e.target.closest('.recent-chip');
    if (!chip) return;
    document.getElementById('calc-item').value = decodeURIComponent(chip.dataset.recent);
    document.getElementById('calc-qty').value = Math.max(1, +chip.dataset.qty || 1);
    runCalculator();
  });

  // Apply plan (multi)
  document.getElementById('calc-multi').addEventListener('click', e => {
    const btn = e.target.closest('#apply-multi');
    if (!btn) return;
    btn.textContent = 'Applying…';
    btn.disabled = true;
    snapshotInv();
    // Shared ledger across all tray items
    const ledger = Object.assign({}, INV_TOTAL);
    const invLoc = {};
    for (const k in INV_LOCATIONS) invLoc[k] = INV_LOCATIONS[k].map(l => ({ ...l }));
    const discounts = getDiscounts();
  const result = compute(CALC_TRAY, ALTERNATIVE_CHOICES, ledger, invLoc, DESTINATION, discounts);
    applyPlan(result);
    ANALYTICS.track('apply_plan', { item: CALC_TRAY[0]?.item || 'multi' });
    // Must be recorded before the re-render, which replaces this button.
    markPlanApplied(planSignature(CALC_TRAY));
    runMultiPlan();
    toast(`Combined plan applied. Ctrl+Z to undo.`, 3000, 'success');
  });

  // All-items selection
  const itemsGrid = document.getElementById('items-grid');
  itemsGrid.addEventListener('change', e => {
    const cb = e.target.closest('input[data-item]');
    if (!cb) return;
    const name = decodeURIComponent(cb.dataset.item);
    if (cb.checked) ITEM_SELECTION.add(name); else ITEM_SELECTION.delete(name);
    cb.closest('.item-card').classList.toggle('selected', cb.checked);
    updateBulkBar();
  });
  document.getElementById('items-selall').addEventListener('change', e => {
    const cards = itemsGrid.querySelectorAll('.item-card');
    cards.forEach(c => {
      const name = decodeURIComponent(c.dataset.name);
      const cb = c.querySelector('input[data-item]');
      cb.checked = e.target.checked;
      if (e.target.checked) ITEM_SELECTION.add(name); else ITEM_SELECTION.delete(name);
      c.classList.toggle('selected', e.target.checked);
    });
    updateBulkBar();
  });

  // Bulk add
  const bulkLoc = document.getElementById('bulk-loc');
  const bulkQty = document.getElementById('bulk-qty');
  [...new Set(LOCATIONS)].sort((a, b) => a.localeCompare(b)).forEach(loc => {
    const o = document.createElement('option'); o.value = loc; o.textContent = loc; bulkLoc.appendChild(o);
  });
  document.getElementById('bulk-add').addEventListener('click', () => {
    const location = bulkLoc.value;
    if (!location) { toast('Pick a location for the selected items.'); return; }
    const mode = document.getElementById('bulk-mode').value;
    const qty = Math.max(1, parseInt(bulkQty?.value, 10) || 1);
    if (ITEM_SELECTION.size === 0) { toast('Select at least one item.'); return; }
    ITEM_SELECTION.forEach(name => applyEntry(name, location, qty, mode));
    const n = ITEM_SELECTION.size;
    ITEM_SELECTION.clear();
    renderItems(); renderInventory();
    ANALYTICS.track('inventory_edit', { mode: 'bulk_' + mode });
    toast(`Added ${n} item${n > 1 ? 's' : ''} to ${esc(location)} (${mode}, qty ${qty}).`);
  });
  document.getElementById('bulk-clear').addEventListener('click', () => {
    ITEM_SELECTION.clear();
    renderItems();
  });

  // Player bar
  document.getElementById('player-select').addEventListener('change', e => {
    PLAYERS.active = e.target.value; savePlayers(PLAYERS); recomputeInv(); refreshAll();
    ANALYTICS.track('player_switch');
  });
  document.getElementById('player-new').addEventListener('click', () => {
    // Inline name input instead of browser prompt()
    const existing = document.querySelector('.player-new-input');
    if (existing) existing.remove();
    const bar = document.querySelector('.playerbar');
    const row = document.createElement('span');
    row.className = 'player-new-input';
    row.style.cssText = 'display:inline-flex;gap:4px;align-items:center;margin-left:8px';
    const inp = document.createElement('input');
    inp.type = 'text'; inp.placeholder = 'player name…';
    inp.style.cssText = 'background:var(--panel);color:var(--text);border:1px solid var(--line);border-radius:4px;padding:4px 8px;font-size:12px;width:140px';
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const n = inp.value.trim();
        if (!n) { row.remove(); return; }
        if (PLAYERS.players[n]) { toast('That player already exists.'); row.remove(); return; }
        PLAYERS.players[n] = []; PLAYERS.active = n; savePlayers(PLAYERS); recomputeInv(); refreshAll();
        row.remove();
      }
      if (e.key === 'Escape') row.remove();
    });
    const btn = document.createElement('button');
    btn.textContent = 'Create';
    btn.style.cssText = 'background:linear-gradient(135deg,var(--accent),var(--purple));color:#fff;border:none;border-radius:4px;padding:4px 10px;font-size:11px;cursor:pointer';
    btn.addEventListener('click', () => { inp.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter'})); });
    row.append(inp, btn);
    bar.appendChild(row);
    inp.focus();
  });
  // Remove player — two-click confirm; deletes locally only.
  let playerRemoveArmed = null;
  document.getElementById('player-remove')?.addEventListener('click', () => {
    const btn = document.getElementById('player-remove');
    const name = document.getElementById('player-select').value || PLAYERS.active;
    if (!name) { toast('No player selected.'); return; }
    if (playerRemoveArmed !== name) {
      playerRemoveArmed = name;
      btn.textContent = 'Confirm ×';
      toast(`Click again to remove "${name}" from this device.`, 4000);
      setTimeout(() => { playerRemoveArmed = null; btn.textContent = '− Remove'; }, 4000);
      return;
    }
    playerRemoveArmed = null;
    btn.textContent = '− Remove';
    delete PLAYERS.players[name];
    delete SHARED_INV[name];
    if (PLAYERS.active === name) PLAYERS.active = Object.keys(PLAYERS.players)[0] || '';
    savePlayersLocal(PLAYERS);
    recomputeInv(); refreshAll();
    toast(`Removed player "${name}".`, 3000, 'success');
  });
  document.getElementById('player-import').addEventListener('click', () =>
    document.getElementById('player-import-file').click());
  document.getElementById('player-import-file').addEventListener('change', e => {
    if (e.target.files[0]) handleImportFile(e.target.files[0]);
    e.target.value = '';
  });
  document.getElementById('player-export').addEventListener('click', () => {
    downloadJSON(exportPlayer(), 'cmg-' + PLAYERS.active.replace(/\s+/g, '_') + '.json');
  });

  // Inventory editor
  populateZones(); renderQuickPicker();
  // Lazy-load inventory charts on expand
  document.getElementById('inv-charts-details').addEventListener('toggle', function() {
    if (this.open) renderInvCharts();
  });
  // Item detail panel: close on backdrop click, × button, or Escape
  document.getElementById('inv-detail-overlay').addEventListener('click', function(e) {
    if (e.target === this || e.target.closest('#idp-close')) { closeInvDetail(); return; }
    var plan = e.target.closest('[data-idp-plan]');
    if (plan) {
      var item = decodeURIComponent(plan.dataset.idpPlan);
      closeInvDetail();
      document.getElementById('calc-item').value = item;
      setView('calc');
      runCalculator();
    }
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && document.getElementById('inv-detail-overlay').classList.contains('open')) closeInvDetail();
  });
  // Open the detail panel from item names in the zone editor / totals table.
  ['zone-body', 'inv-table'].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', function(e) {
      var link = e.target.closest('[data-idp]');
      if (!link) return;
      // Dragging out a text selection ends in a click. A plain click leaves the
      // selection collapsed, so a non-collapsed one means the user was
      // selecting (e.g. overshooting a quantity) — don't hijack that with the
      // item card.
      var sel = window.getSelection && window.getSelection();
      if (sel && !sel.isCollapsed && sel.toString().trim()) return;
      showInvItemDetail(decodeURIComponent(link.dataset.idp));
    });
    el.addEventListener('keydown', function(e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var link = e.target.closest('[data-idp]');
      if (link) { e.preventDefault(); showInvItemDetail(decodeURIComponent(link.dataset.idp)); }
    });
  });
  // Quick-picker: category tab clicks
  document.getElementById('qp-cats').addEventListener('click', e => {
    var btn = e.target.closest('[data-qp-cat]'); if (!btn) return;
    QP_CATEGORY = btn.dataset.qpCat; renderQuickPicker();
  });
  // Quick-picker: item button clicks → fill inv-item field
  document.getElementById('qp-grid').addEventListener('click', e => {
    var btn = e.target.closest('[data-qp-item]'); if (!btn) return;
    document.getElementById('inv-item').value = btn.dataset.qpItem;
    renderQuickPicker(); // reflect the selection in the grid
    const q = document.getElementById('inv-qty');
    q.focus(); q.select(); // type the amount straight away
  });
  // Quick-picker: free-text search across all items
  document.getElementById('qp-search')?.addEventListener('input', () => renderQuickPicker());
  document.getElementById('qp-search')?.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    // Enter with exactly one match selects it and jumps to quantity.
    const only = document.querySelectorAll('#qp-grid [data-qp-item]');
    if (only.length === 1) {
      document.getElementById('inv-item').value = only[0].dataset.qpItem;
      const q = document.getElementById('inv-qty'); q.focus(); q.select();
    }
  });
  // Enter in the quantity box adds — the picker focuses this field, so without
  // it the fastest path still required reaching for the mouse.
  document.getElementById('inv-qty').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('inv-addzone').click();
  });
  // Per-row move: open/close the inline partial-move form
  document.getElementById('zone-body').addEventListener('click', e => {
    const open = e.target.closest('[data-zmove]');
    if (open) {
      const row = open.closest('.zone-row-item');
      const form = row.querySelector('.zr-move');
      // only one row's form open at a time
      document.querySelectorAll('#zone-body .zr-move').forEach(f => { if (f !== form) f.hidden = true; });
      form.hidden = !form.hidden;
      if (!form.hidden) { const qi = form.querySelector('.zr-move-qty'); qi.focus(); qi.select(); }
      return;
    }
    if (e.target.closest('.zr-move-cancel')) {
      e.target.closest('.zr-move').hidden = true; return;
    }
    // ¼ / ½ / All quantity presets
    const preset = e.target.closest('.zr-preset');
    if (preset) {
      const qi = preset.closest('.zr-move').querySelector('.zr-move-qty');
      const max = parseInt(qi.max, 10) || 1;
      qi.value = Math.max(1, Math.floor(max * parseFloat(preset.dataset.frac)));
      qi.focus(); qi.select();
      return;
    }
    const go = e.target.closest('[data-zmovego]');
    if (go) { doRowMove(go.closest('.zone-row-item')); return; }
  });
  document.getElementById('zone-body').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.closest('.zr-move-qty')) {
      e.preventDefault(); doRowMove(e.target.closest('.zone-row-item'));
    }
  });
  document.getElementById('inv-zone').addEventListener('change', e => {
    ACTIVE_ZONE = e.target.value;
    // Selections belong to the zone they were made in — carrying them across
    // would arm the move bar with items the user can no longer see.
    ZONE_MOVE_SELECTED.clear(); updateMoveBar();
    renderZone();
    // The picker's "have" badges are per-zone, so it has to re-render too —
    // without this it kept showing the previously selected colony's stock.
    renderQuickPicker();
  });
  document.getElementById('inv-addzone').addEventListener('click', () => {
    const zone = ACTIVE_ZONE;
    if (!zone) { toast('Pick a zone/colony first.'); return; }
    const item = document.getElementById('inv-item').value.trim();
    const qty = Math.max(0, parseInt(document.getElementById('inv-qty').value, 10) || 0);
    if (!item) { toast('Pick or type an item first.'); return; }
    if (!ALL_ITEMS.has(item)) { toast(`"${item}" isn't a known item — pick one from the list.`); return; }
    if (qty <= 0) { toast('Enter a quantity above 0.'); return; }
    // Was 'set', which silently REPLACED the stack: gathering 50 more of an
    // item you had 200 of left you with 50. "+ Add" now accumulates; editing a
    // row's number input remains the way to set an exact value.
    const before = getInv()
      .filter(e => e.item === item && e.location === zone)
      .reduce((s, e) => s + e.quantity, 0);
    applyEntry(item, zone, qty, 'add');
    document.getElementById('inv-item').value = '';
    document.getElementById('inv-qty').value = 1;
    ACTIVE_ZONE = zone;
    refreshInventoryUI();
    document.getElementById('inv-zone').value = zone;
    toast(`+${fmt(qty)} ${displayName(item)} at ${zone} (now ${fmt(before + qty)}).`, 2500, 'success');
    // Ready for the next item — stocking a zone is a repetitive task.
    document.getElementById('qp-search')?.focus();
  });
  document.getElementById('inv-item').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('inv-addzone').click(); });
  document.getElementById('zone-body').addEventListener('input', e => {
    const q = e.target.closest('input[data-zq]'); if (!q) return;
    const item = decodeURIComponent(q.dataset.zq);
    const zone = ACTIVE_ZONE;
    const v = Math.max(0, parseInt(q.value, 10) || 0);
    applyEntry(item, zone, v, 'set');
    updateZoneTotal(); renderInventory();
  });
  document.getElementById('zone-body').addEventListener('click', e => {
    const x = e.target.closest('button[data-zx]'); if (!x) return;
    if (x) { e.preventDefault(); const item = decodeURIComponent(x.dataset.zx);
    deleteEntry(item, ACTIVE_ZONE);
    ZONE_MOVE_SELECTED.delete(item); updateMoveBar();
    refreshInventoryUI(); }
  });
  // Zone move: checkbox toggle
  document.getElementById('zone-body').addEventListener('change', e => {
    // Quantity committed (Enter, or clicking away) — now it's safe to re-render
    // and re-sort. The live `input` handler can't, since replacing the DOM
    // would destroy the field mid-edit.
    var qEdit = e.target.closest('input[data-zq]');
    if (qEdit) {
      var editedKey = qEdit.dataset.zq;
      renderZone();       // re-sorts by quantity, highest first
      renderQuickPicker(); // its badges are this zone's quantities
      // Put the caret back on the same item so consecutive edits stay quick,
      // even though the row has just moved to a new position in the list.
      var again = Array.prototype.filter.call(
        document.querySelectorAll('#zone-body input[data-zq]'),
        el => el.dataset.zq === editedKey
      )[0];
      if (again) { again.focus(); again.select(); }
      return;
    }
    var cb = e.target.closest('input[data-zm]'); if (!cb) return;
    // data-zm is URL-encoded; store the REAL item name so doZoneMove can match
    // entries (encoded "organic%20material" never equals "organic material").
    var zmItem = decodeURIComponent(cb.dataset.zm);
    if (cb.checked) ZONE_MOVE_SELECTED.add(zmItem);
    else ZONE_MOVE_SELECTED.delete(zmItem);
    updateMoveBar();
  });
  document.getElementById('zone-move-go').addEventListener('click', doZoneMove);
  document.getElementById('zone-move-clear').addEventListener('click', function() {
    ZONE_MOVE_SELECTED.clear(); updateMoveBar();
    document.querySelectorAll('input[data-zm]').forEach(function(cb) { cb.checked = false; });
  });

  // Delete from inventory table
  document.getElementById('inv-table').addEventListener('click', e => {
    const btn = e.target.closest('button.x');
    if (!btn) return;
    const item = decodeURIComponent(btn.dataset.item);
    const loc = decodeURIComponent(btn.dataset.loc);
    deleteEntry(item, loc); renderInventory();
    toast(`Removed ${esc(item)} at ${esc(loc)}.`);
  });

  // Path-choice dropdowns
  document.getElementById('calc-result').addEventListener('change', e => {
    const sel = e.target.closest('select[data-alt]');
    if (!sel) return;
    const item = decodeURIComponent(sel.dataset.alt);
    ALTERNATIVE_CHOICES[item] = parseInt(sel.value, 10);
    savePaths();
    if (CALC_TRAY.length) runMultiPlan(); else runCalculator();
  });
  document.getElementById('calc-multi').addEventListener('change', e => {
    const sel = e.target.closest('select[data-alt]');
    if (!sel) return;
    const item = decodeURIComponent(sel.dataset.alt);
    ALTERNATIVE_CHOICES[item] = parseInt(sel.value, 10);
    savePaths();
    runMultiPlan();
  });

  // Keyboard shortcuts: Ctrl+Z undo (outside form fields), / to focus search
  const VIEW_SEARCH = { calc: 'picker-search', inventory: 'inv-search', colonies: 'col-search', items: 'items-search', requests: 'req-search', drugs: 'drug-search', battle: 'bn-search' };
  document.addEventListener('keydown', e => {
    const t = e.target;
    const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !typing) {
      if (undoInv()) { e.preventDefault(); toast('Undo — inventory restored.', 3000, 'success'); }
    }
    if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const active = document.querySelector('.view.active');
      const id = active && VIEW_SEARCH[active.id.replace('view-', '')];
      const input = id && document.getElementById(id);
      if (input) { e.preventDefault(); input.focus(); input.select(); }
    }
    if (e.key === 'Escape') {
      const overlay = document.getElementById('gear-picker-overlay');
      if (overlay && !overlay.hidden) overlay.hidden = true;
    }
  });

  // Load shared plan from URL hash
  loadPlanFromHash();

  // ---- Gear loadout ----
  refreshGear();
  // Slot clicks → picker (right-click to unequip)
  document.querySelectorAll('.gear-slot').forEach(slot => {
    slot.addEventListener('click', (e) => {
      // Don't open picker if clicking the toggle checkbox
      if (e.target.classList.contains('gear-toggle')) return;
      var st = slot.dataset.slotType || 'armor';
      showGearPicker(slot.dataset.slot, st === 'armor' ? slot.dataset.armorType : st);
    });
    slot.addEventListener('contextmenu', e => {
      e.preventDefault();
      var s = slot.dataset.slot;
      var st = slot.dataset.slotType || 'armor';
      if (st === 'armor' && GEAR[s]) { delete GEAR[s]; saveGear(GEAR); }
      else if (st === 'booster') { BOOSTERS[parseInt(s.split('-')[1])] = ''; saveBoosters(); }
      else if (st === 'medikit') { MEDIKIT = null; saveMedikit(); }
      renderGear(); toast('Unequipped.');
    });
    // Tooltip on hover
    slot.addEventListener('mouseenter', () => {
      if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
      const item = GEAR[slot.dataset.slot];
      if (!item) return;
      const recipe = DATA.recipes.find(r => r.output.item === item);
      if (!recipe?.output?.stats) return;
      const stats = recipe.output.stats;
      tooltipEl = document.createElement('div');
      tooltipEl.className = 'item-tooltip';
      tooltipEl.innerHTML = '<div class="tt-name">' + esc(item) + '</div>' +
        Object.entries(stats).slice(0, 8).map(function(e) {
          var k = e[0], v = e[1];
          return '<div class="tt-stat"><span class="tt-label">' + (STAT_LABELS[k]||k) + '</span><span class="tt-val">' + (v>0?'+':'') + v + '</span></div>';
        }).join('') + tooltipMaterialsHtml(item);
      document.body.appendChild(tooltipEl);
      var rect = slot.getBoundingClientRect();
      tooltipEl.style.left = Math.min(rect.right + 6, window.innerWidth - tooltipEl.offsetWidth - 8) + 'px';
      tooltipEl.style.top = Math.min(rect.top, window.innerHeight - tooltipEl.offsetHeight - 8) + 'px';
    });
    slot.addEventListener('mouseleave', () => {
      if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
    });
  });

  // ---- Production requests ----
  loadRequests(); populateReqForm(); renderRequests(); startReqPolling();
  document.getElementById('req-form').addEventListener('submit', e => {
    e.preventDefault();
    const item = document.getElementById('req-item').value.trim();
    if (!item) { toast('Enter an item name.'); return; }
    if (!ALL_ITEMS.has(item)) { toast('Pick a valid item first.'); return; }
    const qty = parseInt(document.getElementById('req-qty').value) || 1;
    const assignee = document.getElementById('req-assign').value || null;
    const aqty = parseInt(document.getElementById('req-aqty').value) || qty;
    const deliver_to = document.getElementById('req-deliver-to').value || null;
    const deliver_colony = document.getElementById('req-deliver-colony').value || null;
    const notes = document.getElementById('req-notes').value.trim() || null;
    const newReq = { id: reqId(), item, quantity: qty, requester: PLAYERS.active, assignee, assigned_qty: aqty, deliver_to, deliver_colony, notes, status: assignee ? 'assigned' : 'open', created_at: Date.now() };
    REQUESTS.push(newReq);
    renderRequests();
    syncRequests([{ op: 'upsert', request: newReq }]);
    document.getElementById('req-form').reset();
    ANALYTICS.track('request_create');
    toast(`Requested ${qty}× ${item}.`);
  });
  // Filter change handlers
  document.getElementById('req-filter-status').addEventListener('change', renderRequests);
  document.getElementById('req-filter-assignee').addEventListener('change', renderRequests);
  document.getElementById('req-search')?.addEventListener('input', renderRequests);
  // Bulk select actions via checkbox delegation
  document.getElementById('req-list').addEventListener('change', e => {
    if (!e.target.classList.contains('req-card-bulk')) return;
    const bar = document.getElementById('req-bulk-bar');
    const count = document.querySelectorAll('.req-card-bulk:checked').length;
    document.getElementById('req-bulk-count').textContent = count + ' selected';
    bar.classList.toggle('visible', count > 0);
  });
  document.getElementById('req-bulk-complete').addEventListener('click', () => {
    const ops = [];
    document.querySelectorAll('.req-card-bulk:checked').forEach(cb => {
      const r = REQUESTS.find(r => r.id === cb.dataset.reqBulk);
      if (r && r.status !== 'complete') { r.status = 'complete'; r.completed_at = Date.now(); r.completed_by = PLAYERS.active; ops.push({ op: 'upsert', request: r }); }
    });
    renderRequests(); document.getElementById('req-bulk-bar').classList.remove('visible');
    if (ops.length) syncRequests(ops);
    toast('Marked selected as complete.');
  });
  document.getElementById('req-bulk-delete').addEventListener('click', () => {
    const ids = new Set([...document.querySelectorAll('.req-card-bulk:checked')].map(cb => cb.dataset.reqBulk));
    REQUESTS = REQUESTS.filter(r => !ids.has(r.id));
    renderRequests(); document.getElementById('req-bulk-bar').classList.remove('visible');
    if (ids.size) syncRequests([...ids].map(id => ({ op: 'delete', id })));
    toast('Deleted selected requests.');
  });
  // Theme swatches
  document.querySelectorAll('.theme-btn').forEach(btn => {
    const swatch = document.createElement('span');
    swatch.className = 'theme-swatch ' + btn.dataset.theme;
    swatch.setAttribute('aria-hidden', 'true');
    btn.prepend(swatch);
  });
  // Export / Import
  document.getElementById('req-export').addEventListener('click', () => {
    downloadJSON(REQUESTS, 'er-production-requests.json'); toast('Requests exported.');
  });
  document.getElementById('req-import').addEventListener('click', () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json';
    inp.addEventListener('change', () => {
      if (!inp.files[0]) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (Array.isArray(data)) { REQUESTS = data; renderRequests(); toast(`Imported ${data.length} local requests.`); }
          else toast('Invalid requests file.');
        } catch(e) { toast('Failed to parse.'); }
      };
      reader.readAsText(inp.files[0]);
    });
    inp.click();
  });
  // Refresh local request storage
  document.getElementById('req-refresh').addEventListener('click', () => {
    loadRequests(); toast('Refreshed local data.');
  });
  // Picker close
  document.getElementById('gear-picker-close').addEventListener('click', () => {
    document.getElementById('gear-picker-overlay').hidden = true;
  });
  document.getElementById('gear-picker-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) e.target.hidden = true;
  });
  // Save/Load/Clear/Export/Import gear sets
  document.getElementById('gear-save-set').addEventListener('click', () => {
    if (!Object.keys(GEAR).length) { toast('Equip at least one armor piece first.'); return; }
    // Inline name input instead of browser prompt()
    const existing = document.querySelector('.gear-set-name-input');
    if (existing) existing.remove();
    const bar = document.querySelector('.gear-actions');
    const row = document.createElement('span');
    row.className = 'gear-set-name-input';
    row.style.cssText = 'display:inline-flex;gap:4px;align-items:center;width:100%';
    const inp = document.createElement('input');
    inp.type = 'text'; inp.placeholder = 'set name…';
    inp.style.cssText = 'flex:1;background:var(--panel);color:var(--text);border:1px solid var(--line);border-radius:4px;padding:4px 8px;font-size:12px;min-width:0';
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const n = inp.value.trim();
        if (!n) { row.remove(); return; }
        const set = { id: reqId(), name: n, gear: { ...GEAR }, owner: PLAYERS.active || 'anonymous', created_at: Date.now(), votes: {} };
        SHARED_GEAR.push(set);
        renderGearSets();
        syncShared('gear', [{ op: 'upsert', set }]);
        ANALYTICS.track('gear_save');
        toast(`Saved gear preset "${n}" locally.`);
        row.remove();
      }
      if (e.key === 'Escape') row.remove();
    });
    const btn = document.createElement('button');
    btn.textContent = 'Save';
    btn.style.cssText = 'background:linear-gradient(135deg,var(--accent),var(--purple));color:#fff;border:none;border-radius:4px;padding:4px 10px;font-size:11px;cursor:pointer';
    btn.addEventListener('click', () => { inp.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter'})); });
    row.append(inp, btn);
    bar.appendChild(row);
    inp.focus();
  });
  document.getElementById('gear-clear').addEventListener('click', () => {
    GEAR = {}; saveGear(GEAR); renderGear(); renderGearSets();
    toast('Gear loadout cleared.');
  });
  // Load Set → had NO handler at all (dead button). Sets are loaded from the
  // Guild Gear Library's per-set Load button, which sits lower in the sidebar
  // and is often below the fold — so point the user at it.
  document.getElementById('gear-load-set').addEventListener('click', () => {
    const list = document.getElementById('gear-sets-list');
    if (!list) return;
    list.scrollIntoView({ behavior: 'smooth', block: 'center' });
    list.classList.add('flash-target');
    setTimeout(() => list.classList.remove('flash-target'), 1200);
    if (!SHARED_GEAR.length) toast('No saved sets yet — equip armor and Save Gear Set first.');
    else toast('Pick a set below and press Load.');
  });
  // Craft Set → add all equipped items to multi-calc tray
  document.getElementById('gear-craft-set').addEventListener('click', () => {
    const items = Object.values(GEAR);
    if (!items.length) { toast('Equip at least one armor piece first.'); return; }
    items.forEach(item => addToTray(item, 1));
    toast(`Added ${items.length} items to plan.`);
    setView('calc');
  });
  document.getElementById('gear-export-set').addEventListener('click', () => {
    downloadJSON({ type: 'er_gear_set', gear: GEAR, shared_sets: SHARED_GEAR }, 'er-gear.json');
    toast('Gear exported.');
  });
  document.getElementById('gear-import-set').addEventListener('click', () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json';
    inp.addEventListener('change', () => {
      if (!inp.files[0]) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const obj = JSON.parse(reader.result);
          if ((obj.type === 'er_gear_set' || obj.type === 'cmg_gear_set') && obj.gear) {
            GEAR = obj.gear;
            saveGear(GEAR); renderGear();
            // Add imported presets to the local library.
            const owner = PLAYERS.active || 'anonymous';
            const ops = [];
            const importedSets = Array.isArray(obj.shared_sets) ? obj.shared_sets
              : obj.sets ? Object.entries(obj.sets).map(([name, gear]) => ({ name, gear })) : [];
            importedSets.forEach(s => {
              if (!s || !s.gear || !s.name) return;
              if (SHARED_GEAR.some(x => x.name === s.name)) return;
              const set = { id: s.id || reqId(), name: s.name, gear: s.gear, owner: s.owner || owner, created_at: s.created_at || Date.now(), votes: s.votes || {} };
              SHARED_GEAR.push(set);
              ops.push({ op: 'upsert', set });
            });
            renderGearSets();
            if (ops.length) syncShared('gear', ops);
            toast(ops.length ? `Gear imported — ${ops.length} local preset(s) added.` : 'Gear imported.');
          } else { toast('Invalid gear file.'); }
        } catch(e) { toast('Failed to parse gear file.'); }
      };
      reader.readAsText(inp.files[0]);
    });
    inp.click();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // § ANALYTICS TAB — privacy-respecting self-hosted usage dashboard
  // ═══════════════════════════════════════════════════════════════════════════

  // Local-only analytics: no remote endpoint is required by the public build.
  async function fetchAnalyticsStats(days) {
    const status = document.getElementById('analytics-status');
    try {
      status.textContent = 'Loading local data…';
      const cutoff = Date.now() - (days * 86400000);
      const events = JSON.parse(localStorage.getItem('er_calculator_analytics_v1') || '[]')
        .filter(e => Number(e.ts) >= cutoff);
      const totals = {
        pageviews: events.filter(e => e.type === 'pageview').length,
        calculates: events.filter(e => e.type === 'calculate').length,
        apply_plans: events.filter(e => e.type === 'apply_plan').length,
        request_creates: events.filter(e => e.type === 'request_create').length,
        inventory_edits: events.filter(e => e.type === 'inventory_edit').length,
        gear_saves: events.filter(e => e.type === 'gear_save').length,
        player_switches: events.filter(e => e.type === 'player_switch').length,
      };
      const byDay = new Map();
      const items = new Map();
      for (const event of events) {
        const day = new Date(event.ts).toISOString().slice(0, 10);
        byDay.set(day, (byDay.get(day) || 0) + 1);
        if (event.type === 'calculate' && event.item) items.set(event.item, (items.get(event.item) || 0) + 1);
      }
      const daysData = [...byDay].sort((a, b) => a[0].localeCompare(b[0])).map(([date, total]) => ({ date, total }));
      const dayCount = new Set(events.map(e => new Date(e.ts).toISOString().slice(0, 10))).size;
      status.textContent = `Updated ${new Date().toLocaleTimeString()} · local only`;
      return {
        event_count: events.length,
        day_count: dayCount,
        totals,
        days: daysData,
        top_items: [...items].sort((a, b) => b[1] - a[1]).map(([item, count]) => ({ item, count })),
      };
    } catch (e) {
      status.textContent = '⚠ local analytics unavailable';
      return null;
    }
  }

  // ---- Render analytics dashboard ---- 
  async function renderAnalytics() {
    const days = parseInt(document.getElementById('analytics-range').value) || 7;
    const stats = await fetchAnalyticsStats(days);
    
    const cards = document.getElementById('analytics-cards');
    const viewsChart = document.getElementById('analytics-chart-views');
    const featuresChart = document.getElementById('analytics-chart-features');
    const itemsChart = document.getElementById('analytics-chart-items');

    if (!stats || stats.event_count === 0) {
      cards.innerHTML = '';
      const empty = '<div class="analytics-empty">No analytics data yet for this period. Events are stored locally in this browser.</div>';
      clearCanvas(viewsChart); clearCanvas(featuresChart); clearCanvas(itemsChart);
      viewsChart.parentElement.insertAdjacentHTML('beforebegin', empty);
      return;
    }

    // Remove any lingering empty message
    document.querySelectorAll('.analytics-empty, .analytics-error').forEach(el => el.remove());

    // Stats cards
    const t = stats.totals;
    cards.innerHTML = [
      { val: stats.event_count, label: 'Total events' },
      { val: stats.day_count, label: 'Active days' },
      { val: t.pageviews, label: 'Page views' },
      { val: t.calculates, label: 'Calculations' },
      { val: t.apply_plans, label: 'Plans applied' },
      { val: t.request_creates, label: 'Requests created' },
    ].map(c => `<div class="analytics-card"><div class="ac-val">${fmt(c.val)}</div><div class="ac-label">${c.label}</div></div>`).join('');

    // Page views over time — bar chart
    drawTimelineChart(viewsChart, stats.days);

    // Feature usage — horizontal bar chart
    const featureData = [
      { label: 'Calculator', count: t.calculates, color: '#ff2d95' },
      { label: 'Inventory edits', count: t.inventory_edits, color: '#f59e0b' },
      { label: 'Plans applied', count: t.apply_plans, color: '#22c55e' },
      { label: 'Requests', count: t.request_creates, color: '#3b82f6' },
      { label: 'Gear saves', count: t.gear_saves, color: '#8b2cf5' },
      { label: 'Player switches', count: t.player_switches, color: '#00f0ff' },
    ].filter(f => f.count > 0);
    drawHBarChart(featuresChart, featureData, 'count', 'label');

    // Top items calculated
    if (stats.top_items && stats.top_items.length) {
      const itemData = stats.top_items.slice(0, 15).map(i => ({
        label: i.item, count: i.count, color: '#ff2d95'
      }));
      drawHBarChart(itemsChart, itemData, 'count', 'label');
    } else {
      clearCanvas(itemsChart);
      itemsChart.parentElement.insertAdjacentHTML('beforebegin',
        '<div class="analytics-empty">No item calculations in this period.</div>');
    }
  }

  // ---- Canvas chart helpers ---- 

  function clearCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = 0; canvas.height = 0;
  }

  function setupCanvas(canvas, width, height) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return ctx;
  }

  /** Draw a vertical bar chart for time-series data (page views per day). */
  function drawTimelineChart(canvas, days) {
    if (!days || !days.length) { clearCanvas(canvas); return; }
    const W = Math.max(400, canvas.parentElement.clientWidth - 32);
    const H = 220;
    const ctx = setupCanvas(canvas, W, H);
    const pad = { top: 20, right: 16, bottom: 50, left: 50 };
    const cw = W - pad.left - pad.right;
    const ch = H - pad.top - pad.bottom;

    // Compute max value
    const maxVal = Math.max(1, ...days.map(d => d.total));

    // Background
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = '#1e1e3a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (ch / 4) * i;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
      // Value label
      ctx.fillStyle = '#8a8ab8';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal - (maxVal / 4) * i), pad.left - 6, y + 4);
    }

    // Bars
    const barW = Math.max(4, Math.min(30, (cw / days.length) * 0.7));
    const gap = cw / days.length;
    days.forEach((d, i) => {
      const x = pad.left + i * gap + (gap - barW) / 2;
      const barH = (d.total / maxVal) * ch;
      const y = pad.top + ch - barH;

      // Bar fill
      ctx.fillStyle = '#ff2d95';
      ctx.fillRect(x, y, barW, barH);

      // Bar top highlight
      ctx.fillStyle = '#ff6bb5';
      ctx.fillRect(x, y, barW, 2);
    });

    // Date labels (show every Nth date to avoid crowding)
    const step = Math.max(1, Math.floor(days.length / 8));
    ctx.fillStyle = '#8a8ab8';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    days.forEach((d, i) => {
      if (i % step !== 0 && i !== days.length - 1) return;
      const x = pad.left + i * gap + gap / 2;
      const label = d.date.slice(5); // MM-DD
      ctx.fillText(label, x, pad.top + ch + 16);
    });

    // X-axis
    ctx.strokeStyle = '#2a2a5a';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.left, pad.top + ch); ctx.lineTo(W - pad.right, pad.top + ch); ctx.stroke();
  }

  /** Draw a horizontal bar chart (feature usage, top items). */
  function drawHBarChart(canvas, data, valueKey, labelKey) {
    if (!data || !data.length) { clearCanvas(canvas); return; }
    const W = Math.max(300, canvas.parentElement.clientWidth - 32);
    const barH = 20;
    const gap = 6;
    const H = Math.max(100, data.length * (barH + gap) + 40);
    const ctx = setupCanvas(canvas, W, H);
    const pad = { top: 10, right: 16, bottom: 10, left: 180 };
    const cw = W - pad.left - pad.right;

    const maxVal = Math.max(1, ...data.map(d => d[valueKey]));

    // Background
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, W, H);

    data.forEach((d, i) => {
      const y = pad.top + i * (barH + gap);
      const bw = Math.max(2, (d[valueKey] / maxVal) * cw);
      const color = d.color || '#ff2d95';

      // Label (left-aligned)
      ctx.fillStyle = '#d1d5db';
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'right';
      const label = String(d[labelKey] || '');
      ctx.fillText(label.length > 22 ? label.slice(0, 21) + '…' : label, pad.left - 8, y + barH - 5);

      // Bar background track
      ctx.fillStyle = '#12121e';
      ctx.fillRect(pad.left, y, cw, barH);

      // Bar fill
      ctx.fillStyle = color;
      ctx.fillRect(pad.left, y, bw, barH);

      // Value label
      ctx.fillStyle = '#e0e0f0';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(fmt(d[valueKey]), pad.left + bw + 6, y + barH - 5);
    });
  }

  // ---- Wire analytics tab ---- 
  document.getElementById('analytics-optin').addEventListener('change', e => {
    if (e.target.checked) ANALYTICS.enable();
    else ANALYTICS.disable();
  });

  // Sync checkbox with actual state
  document.getElementById('analytics-optin').checked = ANALYTICS.isEnabled();

  document.getElementById('analytics-range').addEventListener('change', () => {
    renderAnalytics();
  });

  document.getElementById('analytics-refresh').addEventListener('click', () => {
    renderAnalytics();
  });

  // Analytics + terminal audio → hook registry
  let analyticsRendered = false;
  const ANALYTICS_VIEWS = new Set(['analytics']);
  registerViewHook({
    view: 'analytics', once: true,
    fn: function() { if (!analyticsRendered) { analyticsRendered = true; renderAnalytics(); } }
  });
  registerViewHook({ enter: playTerminalAudio });
  // Inventory tab: refresh on enter (handles player switches)
  registerViewHook({ view: 'inventory', enter: refreshInventoryUI });
  // Models tab: load manifest + init viewer on first visit
  let modelsInit = false;
  registerViewHook({
    view: 'models', once: true,
    fn: function() { if (!modelsInit) { modelsInit = true; initModelsView(); } }
  });
 // ═══════════════════════════════════════════════════════════════════════════
  // moved to src/app-core.js (global audio + terminal audio)
  // ═══════════════════════════════════════════════════════════════════════════
  // moved to src/views/reference.js (part 2)
});
