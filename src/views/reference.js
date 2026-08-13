/**
 * src/views/reference.js — Reference tabs
 * ============================================================================
 * Drugs, Battle Nodes, Faction Gallery, Worlds, Weapon Textures.
 * Self-contained render tabs with no shared state beyond global DATA/ENGINE.
 */
'use strict';

// § DRUGS TAB — combat booster reference with code, tier, effects, cost
// ═══════════════════════════════════════════════════════════════════════════
const DRUG_TIER_ORDER = { Low: 0, Medium: 1, High: 2 };

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
  const sheetKeys = sheetStatKeys();
  for (const [k, v] of Object.entries(stats)) {
    if (k === 'durationseconds') continue;
    if (sheetKeys.size && !sheetKeys.has(k)) continue; // recipe-only key
    (v > 0 ? pos : neg).push(`<span class="gbs-chip" title="${esc(STAT_DEFS[k] || '')}"><b>${esc(STAT_LABELS[k] || k)}</b> ${v > 0 ? '+' : ''}${v}</span>`);
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
    // Live sheet wins; fall back to the legacy 1.7 display strings for drugs
    // the sheet doesn't cover (none today, but keep the safety net).
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
      <td class="r">${fmt(d.processing_cost)}</td>
      <td class="r">${fmt(d.chemsub_cost)}</td>
      <td class="r"><strong>${fmt(d.total_uc)} UC</strong></td>
    </tr>`;
  }).join('');

  const countEl = document.getElementById('drug-count');
  if (countEl) countEl.textContent = `${list.length} of ${drugs.length} drugs`;

  document.getElementById('drug-table').innerHTML =
    `<table><thead><tr>
      <th>Drug</th><th>Positive</th><th>Negative</th><th class="r">Duration</th><th title="Chem station power level: Low / Medium / High">Power</th><th class="r">Code</th><th class="r" title="Processing cost per drug">Processing</th><th class="r" title="ChemSub cost (maxed Pegasi 51)">ChemSub</th><th class="r">Total</th>
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
    ? `<div class="bn-map"><img class="bn-map-img" src="${esc(c.map_image)}" alt="${esc(c.name)} battle map" title="Click to enlarge" loading="lazy"></div>`
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
    imgEl.addEventListener('click', () => openMapLightbox(c.map_image, c.name + ' battle map'));
  }
}

function openMapLightbox(src, alt) {
  const existing = document.querySelector('.bn-lightbox');
  if (existing) existing.remove();
  const ov = document.createElement('div');
  ov.className = 'bn-lightbox';
  
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
    if (e.target === ov) ov.remove();
  });
  ov.querySelector('.bn-lightbox-close').addEventListener('click', function() { ov.remove(); });
  
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { ov.remove(); document.removeEventListener('keydown', esc); }
  });
  
  document.body.appendChild(ov);
  requestAnimationFrame(function() { ov.classList.add('show'); });
  update();
}

// ---- Client RE view ----
function renderClient() {
  const re = DATA._client_re;
  if (!re) { document.getElementById('client-report').innerHTML = '<p class="muted">No client data loaded.</p>'; return; }
  
  const card = (title, body) => `<div class="re-card"><h4>${title}</h4>${body}</div>`;
  const tag = (t, cls) => `<span class="tag ${cls||''}">${esc(t)}</span>`;
  const row = (k, v) => `<tr><td>${esc(k)}</td><td>${esc(String(v))}</td></tr>`;
  const tbl = (headers, rows) => `<table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  
  let html = '';
  
  // Engine stack
  const e = re.engine;
  html += card('🖥️ Engine Stack', tbl(['Layer','Technology'],[
    ['Graphics',e.graphics],['Input',e.input],['Audio',e.audio],
    ['Networking',e.networking],['UI',e.ui],['Updater',e.updater],
    ['Compiler',e.compiler]
  ]));
  
  // Binaries
  html += card('📦 Binaries', tbl(['File','Size','Role'], re.binaries.map(b => [b.name,b.size,b.role])));
  
  // Class hierarchy
  let classHtml = '';
  for (const [cat, classes] of Object.entries(re.class_hierarchy)) {
    classHtml += `<div class="re-cat"><strong>${cat.replace(/_/g,' ')}</strong> (${classes.length}): ${classes.map(c => tag(c.replace(/_/g,' '),'mine')).join(' ')}</div>`;
  }
  html += card('🏗️ Class Hierarchy (190 vtables mapped)', classHtml);
  
  // Data structures
  let dsHtml = '';
  for (const [name, desc] of Object.entries(re.data_structures)) {
    dsHtml += `<div class="re-cat"><strong>${name.replace(/_/g,' ')}:</strong> <code>${esc(desc)}</code></div>`;
  }
  html += card('📐 Recovered Data Structures', dsHtml);
  
  // SQL schema
  html += card('🗄️ SQL Schema', `
    <div class="re-cat"><strong>world_objects:</strong> <code>${esc(re.sql_schema.world_objects)}</code></div>
    <div class="re-cat">Object types: ${re.sql_schema.object_types}</div>
    <div class="re-cat">Output: ${re.sql_schema.output}</div>
  `);
  
  // Network
  const n = re.network;
  html += card('🌐 Network Protocol', tbl(['Field','Value'],[
    ['Master Server',n.master_server],['Original',n.original_master],
    ['Encryption',n.encryption],['Protocol',n.protocol]
  ]));
  
  // Console commands
  html += card('⌨️ Console Commands', tbl(['Command','Description'], re.console_commands.map(c => [c.cmd,c.desc])));
  
  // Extraction stats
  html += card('📊 Extraction Stats', tbl(['Metric','Count'],
    Object.entries(re.extraction_stats).map(([k,v]) => [k.replace(/_/g,' '), v.toLocaleString()])
  ));

  // ── 2026-08-07 exhaustive RE (ER-exhaustive-re/) ──
  if (re.launcher_stack) {
    html += card('🚀 Launcher Stack (Velopack)', `
      <div class="re-cat">${esc(re.launcher_stack.summary)}</div>
      ${tbl(['File','Size','Role'], re.launcher_stack.files.map(f => [f.name,f.size,f.role]))}
    `);
  }

  if (re.integrity_check) {
    const ic = re.integrity_check;
    html += card('🛡️ Integrity Check (name-only, NO hashing)', tbl(['Aspect','Finding'], [
      ['Location', ic.location], ['Mechanism', ic.mechanism],
      ['Verifier', ic.verifier], ['Runtime bypass', ic.bypass],
      ['Mod implication', ic.implication]
    ]));
  }

  if (re.production) {
    const pr = re.production;
    html += card('🏭 Production: Prices vs Durations', `
      <div class="re-cat"><strong>Durations = SERVER-authoritative</strong> — ${esc(pr.durations)}</div>
      <div class="re-cat"><strong>Prices = CLIENT-side</strong> — ${esc(pr.prices)}</div>
      <div class="re-cat">Getter <code>${esc(pr.price_getter)}</code> · Dump handler <code>${esc(pr.dump_handler)}</code></div>
    `);
  }

  if (re.server_authoritative) {
    html += card('⚖️ Server-Authoritative Boundaries', tbl(['Surface','Boundary'],
      re.server_authoritative.map(r => r)));
  }

  if (re.security) {
    const s = re.security;
    html += card('🔐 Security Surface', tbl(['Aspect','Finding'], [
      ['TLS / transport', s.tls], ['Telemetry', s.telemetry],
      ['Shared memory', s.shared_memory], ['RSA key', s.rsa_key]
    ]));
  }

  if (re.corrections) {
    html += card('⚠️ Corrections (supersede earlier findings)', 
      re.corrections.map(c => `<div class="re-cat">• ${esc(c)}</div>`).join(''));
  }

  if (re.frontier) {
    html += card('🧩 Unresolved Frontier',
      re.frontier.map(c => `<div class="re-cat">• ${esc(c)}</div>`).join(''));
  }

  // ── Deep-dive history (2026-07-21, kept for reference) ──
  html += card('🔬 Hermes Deep-Dive (July 2026)', `
    <div class="re-cat"><strong>DTX Texture Format Cracked:</strong> 3 variants decoded (DXT1/DXT5). 
      1,546 item/character textures extracted. Sub-image markers (<code>b00d</code>, <code>5009</code>) 
      precede embedded DXT data after the 32-byte header. Format byte at offset 26: 
      <span class="tag">3,4=DXT1</span> <span class="tag">5,6=DXT5</span>
      <span class="tag">exhaustive 08/07</span> = 8,325 DTX: 5,515 DXT1 + 614 DXT3 + 1,459 DXT5 + 732 raw fmt3 + 5 raw fmt0</div>
    <div class="re-cat"><strong>Item ID Hierarchy:</strong> 464 unique base IDs across 13 gear slots, 
      7 armor tiers each, with 12–44 faction/cosmetic variants per tier. 
      Suffix convention: <code>SlotTier_Variant</code> (e.g. <code>ArmPads7_8</code>).</div>
    <div class="re-cat"><strong>Console Commands Found:</strong> 
      <span class="tag">productionprices</span> → <code>ProductionPrices.txt</code> (full recipe dump),
      <span class="tag">itemlist</span> → <code>ItemList.txt</code> (complete item catalog),
      <span class="tag">interactiveobjects</span> → SQL export,
      <span class="tag">barriers</span>, <span class="tag">turrets</span> → per-world SQL dumps
      <span class="tag">08/07</span> + GM/admin builders: spawn, payment, teleport, shutdown, notices</div>
    <div class="re-cat"><strong>Model Sources (.lta):</strong> 458 ASCII model files extracted from dev tools.
      S-expression format with node hierarchies, LOD groups, OBB collision volumes.
      Categories: 93 characters, 66 items, 23 terminals, 74 props, 89 plants, 10 enemies.
      <span class="tag">exhaustive 08/07</span> = 445 readable LTAs in official archive; client LTB = 483 (445 models + 36 renderstyles + 2 UI)</div>
    <div class="re-cat"><strong>Audio Extraction:</strong> 935 WAV files decoded — 359 NPC speech clips, 
      44 colony advertisements, 32 terminal/colony welcome voice lines, 315 combat/ambient SFX.
      All converted to OGG for web playback.
      <span class="tag">exhaustive 08/07</span> = 812 PCM + 123 MP3-in-WAVE; 125 SGT = DirectMusic arrangements</div>
    <div class="re-cat"><strong>CShell.dll String Mining:</strong> 16,132 unique strings extracted.
      Production price format confirmed: <code>{0} Price ({1}) = {2} UC (Yield {3})</code>.
      Armor stat keys: armor, shielding, endurance, resistance, reflection, agility, 
      healthregen, bioregen, staminaregen, biodamage, staminadamage, auraregen.</div>
  `);

  document.getElementById('client-report').innerHTML = html;
}

function updateBulkBar() {
  const bar = document.getElementById('items-bulk');
  if (!bar) return;
  bar.hidden = ITEM_SELECTION.size === 0;
  document.getElementById('bulk-count').textContent = `${ITEM_SELECTION.size} selected`;
  const selAll = document.getElementById('items-selall');
  const cards = document.querySelectorAll('#items-grid .item-card');
  selAll.checked = ITEM_SELECTION.size > 0 && ITEM_SELECTION.size === cards.length;
}


// ═══════════════════════════════════════════════════════════════════════════

// § FACTION GALLERY TAB
// ═══════════════════════════════════════════════════════════════════════════

const FACTIONS = [
  { id: 'BOS', name: 'Brotherhood of Steel', desc: 'Military order' },
  { id: 'CMG', name: 'Colonization & Mining Guild', desc: 'Industrial powerhouse' },
  { id: 'EC', name: 'Eclipse Corporation', desc: 'Corporate empire' },
  { id: 'FDC', name: 'FDC', desc: 'Federal Defense Coalition' },
  { id: 'GOM', name: 'GOM', desc: 'Global Operations Militia' },
  { id: 'LED', name: 'LED', desc: 'Law Enforcement Division' },
  { id: 'MOB', name: 'MOB', desc: 'Organized syndicates' },
  { id: 'VTX', name: 'Vortex', desc: 'Vortex Gate authority' },
];

function renderFactions() {
  const grid = document.getElementById('faction-grid');
  if (!grid) return;
  grid.innerHTML = FACTIONS.map(f => {
    const logo = `gallery/factions/${f.id.toLowerCase()}.png`;
    const slots = ['TorsoArmour_4','ShoulderPads_4','ArmPads_4','LegPads_4','Helmet_4'];
    const armorImgs = slots.map(s => {
      const src = `gallery/factions/${f.id}_${s}.png`;
      return `<img src="${src}" alt="${s}" title="${s.replace('_',' ')} — click to enlarge" loading="lazy" onerror="this.style.display='none'" onclick="event.stopPropagation();openMapLightbox(this.src,this.alt)" />`;
    }).join('');
    
    const rankImgs = Array.from({length:7}, (_,i) => {
      return `<img src="gallery/ranks/${f.id.toLowerCase()}${i+1}.png" alt="Rank ${i+1}" title="Rank ${i+1}" loading="lazy" onerror="this.style.display='none'" />`;
    }).join('');

    const welcomeFile = `voice_extracted/${f.id}.ogg`;
    
    return `<div class="faction-card">
      <div class="faction-card-header">
        <img src="${logo}" alt="${f.name}" onerror="this.style.display='none'" />
        <div>
          <h4>${esc(f.name)}</h4>
          <div class="fc-sub">${esc(f.desc)}</div>
        </div>
      </div>
      <div class="faction-card-body">${armorImgs}</div>
      <div class="faction-ranks">${rankImgs}</div>
      <button class="faction-audio" onclick="event.stopPropagation();playAudio('${welcomeFile}',0.5)">🔊 Welcome</button>
    </div>`;
  }).join('');
}

// The Worlds tab lived here. It is now part of the Colonies tab (renderColonies
// in app.js), which shows the same mine data and welcome audio alongside the
// tax and ownership controls — one card per place rather than the same worlds
// listed twice under two headings.

let factionsRendered = false;
registerViewHook({
  view: 'factions', once: true,
  fn: function() { if (!factionsRendered) { factionsRendered = true; renderFactions(); } }
});
registerViewHook({
  view: 'comms',
  enter: function() { initComms(); },
  leave: function() { stopComms(); }
});
// moved to src/views/comms.js


// ═══════════════════════════════════════════════════════════════════════════
// § WEAPON TEXTURES — show gun textures in weapon comparison
// ═══════════════════════════════════════════════════════════════════════════

const origRenderWeapons = renderWeapons;
renderWeapons = function() {
  origRenderWeapons();
  // Add texture previews after the table renders
  setTimeout(function() {
    document.querySelectorAll('#weapon-table td:first-child').forEach(function(td) {
      var name = td.textContent.trim().toLowerCase();
      // Map weapon names to DTX texture paths
      var texMap = {
        'doa 187': 'textures_extracted/Items/w3_hh.png',
        'chrono enervon pistol ep24': 'textures_extracted/Items/w6_hh.png',
        'aurelian technologies dominator': 'textures_extracted/Items/w2_hh.png',
      };
      var tex = texMap[name];
      if (tex && !td.querySelector('.weapon-tex')) {
        var img = document.createElement('img');
        img.src = tex;
        img.className = 'weapon-tex';
        img.style.cssText = 'margin-right:0.5rem;vertical-align:middle;';
        td.insertBefore(img, td.firstChild);
      }
    });
  }, 100);
};
