/**
 * src/views/player.js — Player management
 * ============================================================================
 * Player switcher, new player dialog, import/export, toast notifications,
 * recent calculations, sharable plans, path persistence.
 */
'use strict';

// § PLAYER BAR — switcher, new player dialog, import/export, remove
// ═══════════════════════════════════════════════════════════════════════════
function renderPlayerBar() {
  const sel = document.getElementById('player-select');
  const factionSel = document.getElementById('player-faction');
  sel.innerHTML = '';
  const names = Object.keys(PLAYERS.players).sort();
  if (names.length === 0) {
    sel.innerHTML = '<option value="" disabled selected>No players yet — create or import one</option>';
  }
  names.forEach(name => {
    const o = document.createElement('option'); o.value = name; o.textContent = name;
    if (name === PLAYERS.active) o.selected = true;
    sel.appendChild(o);
  });
  if (factionSel) {
    factionSel.innerHTML = (window.ER_FACTIONS?.selectable || []).map(f =>
      `<option value="${esc(f.id)}">${esc(f.name)}</option>`).join('');
    factionSel.disabled = names.length === 0;
    factionSel.value = names.length ? (S.getActiveFaction ? S.getActiveFaction() : 'UNAFFILIATED') : 'UNAFFILIATED';
  }
  document.getElementById('player-name').textContent = PLAYERS.active;
}

function refreshAll() {
  renderPlayerBar();
  populateDestinations();
  // Whole inventory tab (zones, quick-picker, totals, dashboard, live charts) —
  // a player switch changes all of it, so go through the one refresh path.
  ZONE_MOVE_SELECTED.clear();
  refreshInventoryUI();
  // renderColonies replaces the old renderMining here: the colony cards show
  // held quantities per ore, so they go stale on a player switch too.
  renderColonies(); renderDrugs(); populateBattleColonies(); renderBattleNodes();
  renderPicker();
  refreshGear();
  // Guild status readout — feature manifest with flavor
  const playerName = PLAYERS.active || 'no operator';
  const invCount = getInv().length;
  const drugCount = (DATA.drugs || []).length;
  const mapCount = 12; // battle node colony maps
  const themeCount = 6; // built-in themes
  const features = [
    { emoji: '📦', label: `${ALL_ITEMS.size} items` },
    { emoji: '🗄️', label: `${invCount} stocked` },
    { emoji: '⛏️', label: `${DATA.mining_sites.length} mine sites` },
    { emoji: '🔧', label: `${DATA.recipes.length} recipes` },
    { emoji: '🗺️', label: `${mapCount} colony maps` },
    { emoji: '💊', label: `${drugCount} combat drugs` },
    { emoji: '🛡️', label: 'gear loadouts' },
    { emoji: '📡', label: 'workspace requests' },
    { emoji: '📶', label: 'offline-ready' },
    { emoji: '🎨', label: `${themeCount} themes` },
  ];
  document.getElementById('stats').innerHTML =
    `<span class="footer-bar">` +
    `<span class="footer-operator">⚙️ Empire Rising · ${esc(playerName)}</span>` +
    features.map(f => `<span class="footer-chip">${f.emoji} ${f.label}</span>`).join('') +
    `</span>`;
  // Clear calc results on any state change; restore welcome if back to zero players
  const cr = document.getElementById('calc-result');
  const cm = document.getElementById('calc-multi');
  cm.innerHTML = '';
  if (Object.keys(PLAYERS.players).length === 0) {
    cr.innerHTML = `<div class="card empty-state">
      <div class="empty-state-icon">👤</div>
      <h3>Welcome to the Empire Rising Production Calculator</h3>
      <p>No players yet — create one or import a local workspace JSON to get started.</p>
      <div class="empty-state-actions">
        <button id="empty-new" class="primary">+ New Player</button>
        <button id="empty-import" class="ghost">Import JSON</button>
      </div>
    </div>`;
    document.getElementById('empty-new').addEventListener('click', () => document.getElementById('player-new').click());
    document.getElementById('empty-import').addEventListener('click', () => document.getElementById('player-import-file').click());
  } else {
    cr.innerHTML = '';
  }
}

function downloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ---- Toast notifications (replaces alert()) ----
// type: '' (default pink) | 'success' (cyan) | 'error' (red)
function toast(msg, duration, type) {
  duration = duration || 3000;
  let area = document.getElementById('toast-area');
  if (!area) {
    area = document.createElement('div');
    area.id = 'toast-area';
    area.setAttribute('aria-live', 'polite');
    document.body.appendChild(area);
  }
  const t = document.createElement('div');
  t.className = 'toast' + (type ? ' ' + type : '');
  t.textContent = msg;
  area.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, duration);
}

// ---- Import with preview ----
function handleImportFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(reader.result);
      const list = Array.isArray(obj) ? obj : obj.inventory;
      if (!Array.isArray(list)) throw new Error('no inventory array');
      const clean = list.filter(e => e && e.item && e.location != null && !isNaN(+e.quantity))
        .map(e => ({ item: String(e.item).trim(), location: String(e.location).trim(), quantity: Math.max(0, Math.floor(+e.quantity)) }));
      let name = (obj.player && typeof obj.player === 'string') ? obj.player.trim() : file.name.replace(/\.json$/i, '');
      if (!name) name = 'Player';

      if (PLAYERS.players[name]) {
        // merge by default
        importPlayer(name, clean);
        if (obj.faction && S.setPlayerFaction) S.setPlayerFaction(name, obj.faction);
        toast(`Merged ${clean.length} entries into existing player "${esc(name)}".`);
      } else {
        importPlayer(name, clean);
        if (obj.faction && S.setPlayerFaction) S.setPlayerFaction(name, obj.faction);
        toast(`Imported ${clean.length} entries for "${esc(name)}".`);
      }
      refreshAll();
    } catch (e) {
      toast('Import failed: ' + e.message, 4000, 'error');
    }
  };
  reader.readAsText(file);
}

// ---- Recent calculations (quick-recalc chips) ----
const RECENT_KEY = 'cmg_recent_v1';
let RECENT = [];
try { RECENT = JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch (e) { RECENT = []; }

function pushRecent(item, qty) {
  RECENT = [{ item, qty }, ...RECENT.filter(r => r.item !== item)].slice(0, 8);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(RECENT)); } catch (e) {}
  renderRecent();
}
function renderRecent() {
  const row = document.getElementById('calc-recent');
  if (!row) return;
  row.hidden = RECENT.length === 0;
  row.innerHTML = RECENT.length
    ? '<span class="recent-label">Recent:</span>' + RECENT.map(r =>
        `<button class="recent-chip" data-recent="${encodeURIComponent(r.item)}" data-qty="${r.qty}" title="Recalculate ${esc(r.qty)} × ${esc(displayName(r.item))}">
           ${iconFor(r.item)}<span class="recent-nm">${esc(displayName(r.item))}</span><span class="recent-q">×${fmt(r.qty)}</span>
         </button>`).join('')
    : '';
}

// ---- Shareable plans (URL hash) ----
let LAST_SINGLE = null; // {item, qty} of the last successful single calculation

function encodePlanHash() {
  const data = {
    t: CALC_TRAY.map(t => ({ i: t.item, q: t.qty })),
    p: ALTERNATIVE_CHOICES
  };
  if (!CALC_TRAY.length && LAST_SINGLE) data.s = { i: LAST_SINGLE.item, q: LAST_SINGLE.qty };
  try {
    return btoa(JSON.stringify(data));
  } catch(e) { return ''; }
}
function decodePlanHash(hash) {
  try {
    return JSON.parse(atob(hash));
  } catch(e) { return null; }
}
function updateShareLink() {
  if (CALC_TRAY.length === 0 && !LAST_SINGLE) {
    history.replaceState(null, '', location.pathname);
    return;
  }
  const hash = encodePlanHash();
  history.replaceState(null, '', '#' + hash);
}
function loadPlanFromHash() {
  if (!location.hash || location.hash === '#') return;
  const data = decodePlanHash(location.hash.slice(1));
  if (!data) return;
  if (data.p) { Object.assign(ALTERNATIVE_CHOICES, data.p); savePaths(); }
  if (data.t && Array.isArray(data.t) && data.t.length) {
    CALC_TRAY = data.t.map(x => ({ item: x.i, qty: x.q || 1 }));
    saveTray();
    renderTray();
    runMultiPlan();
  } else if (data.s && data.s.i) {
    document.getElementById('calc-item').value = data.s.i;
    document.getElementById('calc-qty').value = Math.max(1, +data.s.q || 1);
    runCalculator();
  }
}

// ---- Path persistence ----
function loadPaths() {
  try {
    const raw = localStorage.getItem(PATHS_KEY);
    if (raw) Object.assign(ALTERNATIVE_CHOICES, JSON.parse(raw));
  } catch(e) {}
}
function savePaths() {
  try { localStorage.setItem(PATHS_KEY, JSON.stringify(ALTERNATIVE_CHOICES)); } catch(e) {}
}
loadPaths();

