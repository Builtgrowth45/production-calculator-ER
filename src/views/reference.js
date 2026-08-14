/**
 * src/views/reference.js — Reference tabs
 * ============================================================================
 * Drugs, Battle Nodes, and Worlds.
 * Self-contained render tabs with no shared state beyond global DATA/ENGINE.
 */
'use strict';

// § DRUGS TAB — combat booster reference with code, tier, effects, cost
// ═══════════════════════════════════════════════════════════════════════════
const DRUG_TIER_ORDER = { Low: 0, Medium: 1, High: 2 };
// A positive raw number is not automatically a beneficial effect. These live
// sheet keys describe penalties when they are positive, while a negative
// value is the beneficial direction (for example protection reduction).
const DRUG_ADVERSE_POSITIVE_STATS = new Set([
  'healthdrain', 'staminadrain', 'bioenergydrain', 'biodrain',
  'protectionreduction', 'addiction', 'illegal',
]);
const DRUG_HIDDEN_STATS = new Set(['durationseconds', 'addiction', 'illegal']);

/** Live combat stats for a drug: sheet-merged recipe output.stats (sheet wins). */
function drugLiveStats(name) {
  const r = DATA.recipes.find(rr => rr.output.item === name);
  return (r && r.output.stats) || null;
}

/** Keys the live balance sheet publishes (any item) — recipe-only keys excluded. */
let SHEET_STAT_KEYS = null;
function sheetStatKeys() {
  if (SHEET_STAT_KEYS === null) {
    const s = new Set();
    if (window.BALANCE_STATS) {
      for (const it of BALANCE_STATS.items) {
        for (const k of Object.keys(it.stats || {})) s.add(k);
      }
    }
    SHEET_STAT_KEYS = s;
  }
  return SHEET_STAT_KEYS;
}

/** Split a stats object into positive/negative chips (duration gets its own column). */
function drugChips(stats) {
  if (!stats || !Object.keys(stats).length) return null;
  const pos = [], neg = [];
  for (const [k, v] of Object.entries(stats)) {
    if (DRUG_HIDDEN_STATS.has(k)) continue;
    const adverse = DRUG_ADVERSE_POSITIVE_STATS.has(k) ? v > 0 : v < 0;
    (adverse ? neg : pos).push(`<span class="gbs-chip" title="${esc(STAT_DEFS[k] || '')}"><b>${esc(STAT_LABELS[k] || k)}</b> ${v > 0 ? '+' : ''}${v}</span>`);
  }
  return {
    pos: pos.length ? pos.join('') : '<span class="muted">—</span>',
    neg: neg.length ? neg.join('') : '<span class="muted">—</span>',
    duration: stats.durationseconds ? `${stats.durationseconds}s` : '—',
  };
}

function renderDrugs() {
  const drugs = DATA.drugs || [];
  const sortBy = document.getElementById('drug-sort')?.value || 'name';
  const filter = (document.getElementById('drug-search')?.value || '').toLowerCase().trim();

  let list = drugs.slice();
  if (filter) {
    list = list.filter(d => {
      const live = drugChips(drugLiveStats(d.name));
      return (d.name || '').toLowerCase().includes(filter) ||
        (d.positive || '').toLowerCase().includes(filter) ||
        (d.negative || '').toLowerCase().includes(filter) ||
        String(d.code || '').includes(filter) ||
        (d.tier || '').toLowerCase().includes(filter) ||
        (live && (live.pos + live.neg).toLowerCase().includes(filter));
    });
  }

  list.sort((a, b) => {
    switch (sortBy) {
      case 'tier': return (DRUG_TIER_ORDER[a.tier] ?? 9) - (DRUG_TIER_ORDER[b.tier] ?? 9) || a.name.localeCompare(b.name);
      case 'cost': return (a.total_uc || 0) - (b.total_uc || 0) || a.name.localeCompare(b.name);
      case 'cost-desc': return (b.total_uc || 0) - (a.total_uc || 0) || a.name.localeCompare(b.name);
      case 'code': return String(a.code).localeCompare(String(b.code));
      default: return a.name.localeCompare(b.name);
    }
  });

  const rows = list.map(d => {
    const icon = iconFor(d.name);
    const chips = drugChips(drugLiveStats(d.name));
    // Live sheet wins. Legacy strings remain only as a compatibility fallback
    // for a drug absent from the balance sheet, never mixed with live chips.
    const pos = chips ? chips.pos : `<span class="drug-pos">${esc(d.positive || '—')}</span>`;
    const neg = chips ? chips.neg : `<span class="drug-neg">${esc(d.negative || '—')}</span>`;
    const dur = chips ? chips.duration : '—';
    return `<tr>
      <td>${icon}<strong>${esc(d.name)}</strong></td>
      <td class="drug-cell">${pos}</td>
      <td class="drug-cell">${neg}</td>
      <td class="r">${dur}</td>
      <td><span class="tag tier-${(d.tier || '').toLowerCase()}">${esc(d.tier || '—')}</span></td>
      <td class="r"><code>${esc(String(d.code))}</code></td>
    </tr>`;
  }).join('');

  const countEl = document.getElementById('drug-count');
  if (countEl) countEl.textContent = `${list.length} of ${drugs.length} drugs · effects from the ER Balance Sheet snapshot`;

  document.getElementById('drug-table').innerHTML =
    `<table><thead><tr>
      <th>Drug</th><th>Positive</th><th>Negative</th><th class="r">Duration</th><th title="Chem station power level: Low / Medium / High">Power</th><th class="r">Code</th>
    </tr></thead><tbody>${rows}</tbody></table>`;
}


// ═══════════════════════════════════════════════════════════════════════════
// § BATTLE NODES — 12 colony maps, hackable node tables, lightbox viewer
// ═══════════════════════════════════════════════════════════════════════════
let BN_COLONY_IDX = 0;
const BN_TYPE_LABEL = { powernode: 'Powernode', powerplant: 'Powerplant', node: 'Node' };
function populateBattleColonies() {
  const wrap = document.getElementById('bn-colony-chips');
  if (!wrap) return;
  const colonies = (DATA.battle_nodes && DATA.battle_nodes.colonies) || [];
  const active = Math.min(BN_COLONY_IDX, Math.max(0, colonies.length - 1));
  wrap.innerHTML = colonies.map((c, i) =>
    `<button type="button" class="bn-colony-chip${i === active ? ' active' : ''}" data-bn-colony="${i}" role="tab" aria-selected="${i === active}">${esc(c.name)}</button>`
  ).join('');
  wrap.querySelectorAll('[data-bn-colony]').forEach(btn => {
    btn.addEventListener('click', () => {
      BN_COLONY_IDX = parseInt(btn.dataset.bnColony, 10) || 0;
      populateBattleColonies();
      renderBattleNodes();
    });
  });
  wrap.onkeydown = e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const buttons = [...wrap.querySelectorAll('[data-bn-colony]')];
    const current = Math.max(0, buttons.indexOf(document.activeElement));
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 :
      (current + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].click();
    buttons[next].focus({ preventScroll: true });
  };
}
function renderBattleNodes() {
  const wrap = document.getElementById('bn-body');
  if (!wrap) return;
  const colonies = (DATA.battle_nodes && DATA.battle_nodes.colonies) || [];
  if (!colonies.length) { wrap.innerHTML = '<p class="muted">No battle node data.</p>'; return; }
  const idx = Math.min(BN_COLONY_IDX, colonies.length - 1);
  const c = colonies[idx];
  const filter = (document.getElementById('bn-search')?.value || '').toLowerCase().trim();

  let nodes = c.nodes.slice();
  if (filter) {
    nodes = nodes.filter(n =>
      String(n.num).includes(filter) ||
      (n.nearest_vort || '').toLowerCase().includes(filter) ||
      (BN_TYPE_LABEL[n.type] || n.type).toLowerCase().includes(filter)
    );
  }

  const rows = nodes.map(n => `<tr>
    <td><span class="bn-badge bn-${esc(n.type)}">${n.num}</span></td>
    <td><span class="bn-type bn-${esc(n.type)}">${esc(BN_TYPE_LABEL[n.type] || n.type)}</span></td>
    <td>${n.nearest_vort ? esc(n.nearest_vort) : '<span class="muted">—</span>'}</td>
  </tr>`).join('');

  const notes = c.notes ? `<div class="bn-notes">📌 ${esc(c.notes)}</div>` : '';
  const map = c.map_image
    ? `<figure class="bn-map"><button type="button" class="bn-map-open" aria-label="Open interactive ${esc(c.name)} battle map"><img class="bn-map-img" src="${esc(c.map_image)}" alt="${esc(c.name)} battle map" loading="lazy"><span>Open interactive map</span></button><figcaption>Tap to zoom and pan · mouse wheel zooms</figcaption></figure>`
    : '';

  const countEl = document.getElementById('bn-count');
  if (countEl) countEl.textContent = `${nodes.length} node${nodes.length === 1 ? '' : 's'} · ${c.name}`;

  wrap.innerHTML = `<div class="bn-layout">
    <div class="bn-table-wrap">
      ${notes}
      <table class="bn-table"><thead><tr><th>Node</th><th>Type</th><th>Nearest Vort</th></tr></thead><tbody>${rows}</tbody></table>
    </div>
    ${map}
  </div>`;

  const imgEl = wrap.querySelector('.bn-map-img');
  if (imgEl) {
    imgEl.addEventListener('error', () => {
      const m = imgEl.closest('.bn-map');
      if (m) m.innerHTML = `<div class="bn-map-missing">Map image not found: ${esc(c.map_image)}</div>`;
    });
    wrap.querySelector('.bn-map-open')?.addEventListener('click', () => openMapLightbox(c.map_image, c.name + ' battle map'));
  }
}

function openMapLightbox(src, alt) {
  const existing = document.querySelector('.bn-lightbox');
  if (existing) existing.remove();
  const ov = document.createElement('div');
  ov.className = 'bn-lightbox';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', alt);
  
  let scale = 1, panX = 0, panY = 0, dragging = false, lastX = 0, lastY = 0;
  
  ov.innerHTML = '<button class="bn-lightbox-close" aria-label="Close">&times;</button>' +
    '<div class="bn-lightbox-zoom"><button class="bn-zoom-btn" data-zoom="in">+</button>' +
    '<span class="bn-zoom-level">100%</span>' +
    '<button class="bn-zoom-btn" data-zoom="out">−</button>' +
    '<button class="bn-zoom-btn" data-zoom="reset">↺</button></div>' +
    '<div class="bn-lightbox-viewport"><img src="' + esc(src) + '" alt="' + esc(alt) + '" class="bn-lightbox-img" /></div>';
  
  const img = ov.querySelector('.bn-lightbox-img');
  const vp = ov.querySelector('.bn-lightbox-viewport');
  const level = ov.querySelector('.bn-zoom-level');
  
  function update() {
    img.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + scale + ')';
    level.textContent = Math.round(scale * 100) + '%';
  }
  
  vp.addEventListener('wheel', function(e) {
    e.preventDefault();
    var delta = e.deltaY > 0 ? 0.9 : 1.1;
    var newScale = Math.max(0.2, Math.min(5, scale * delta));
    // Zoom toward cursor
    var rect = vp.getBoundingClientRect();
    var mx = e.clientX - rect.left - rect.width/2;
    var my = e.clientY - rect.top - rect.height/2;
    panX = mx - (mx - panX) * (newScale / scale);
    panY = my - (my - panY) * (newScale / scale);
    scale = newScale;
    update();
  });
  
  vp.addEventListener('mousedown', function(e) {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    vp.style.cursor = 'grabbing';
    e.preventDefault();
  });
  
  window.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    panX += e.clientX - lastX;
    panY += e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    update();
  });
  
  window.addEventListener('mouseup', function() {
    dragging = false;
    vp.style.cursor = scale > 1 ? 'grab' : 'default';
  });
  
  ov.querySelectorAll('.bn-zoom-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var action = btn.dataset.zoom;
      if (action === 'in') scale = Math.min(5, scale * 1.4);
      else if (action === 'out') scale = Math.max(0.2, scale / 1.4);
      else { scale = 1; panX = 0; panY = 0; }
      update();
    });
  });
  
  ov.addEventListener('click', function(e) {
    if (e.target === ov) close();
  });
  const close = () => { ov.remove(); document.removeEventListener('keydown', onKey); };
  function onKey(e) { if (e.key === 'Escape') close(); }
  ov.querySelector('.bn-lightbox-close').addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  
  document.body.appendChild(ov);
  requestAnimationFrame(function() { ov.classList.add('show'); });
  ov.querySelector('.bn-lightbox-close').focus({ preventScroll: true });
  update();
}
