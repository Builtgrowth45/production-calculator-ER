/**
 * src/app.js — CMG Production Planner (calculator core)
 * ============================================================================
 * The only remaining section: the production calculator tab.
 * All other tabs and infrastructure moved to separate files.
 *
 * SECTION:
 *   § CALCULATOR TAB   L44–287   Picker, plan rendering, multi-item tray, batch
 *
 * MOVED:
 *   src/app-core.js        — IMPORTS, STORE, DESTINATION, setView, THEME, audio
 *   src/app-init.js        — DOMContentLoaded and event wiring
 *   src/views/comms.js     — Radio player + terminal audio
 *   src/views/reference.js — Drugs and Battle Nodes
 *   src/views/gear.js      — Gear textures and local loadouts
 *   src/views/inventory.js — Zone editor, mining, and inventory
 *   src/views/player.js    — Player bar, toast, import/export, share
 *
 * LOAD ORDER: game_data → store → engine → chart.min
 *             → app-core → app.js → views/* → app-init
 */
'use strict';

// moved to src/app-core.js

// ═══════════════════════════════════════════════════════════════════════════
// § CALCULATOR TAB — picker, plan rendering, multi-item tray, batch planning
// (a duplicate saveTransfersDone() lived here; the real one sits with the
//  TRANSFERS_DONE declaration below)

// ── Produce checkbox state (persisted) ──
var PRODUCE_DONE = {};
try { PRODUCE_DONE = JSON.parse(localStorage.getItem('cmg_produce_done_v1')) || {}; } catch (e) { PRODUCE_DONE = {}; }
function saveProduceDone() { try { localStorage.setItem('cmg_produce_done_v1', JSON.stringify(PRODUCE_DONE)); } catch (e) {} }

// ── Plan identity ──────────────────────────────────────────────────────────
// The tick state is keyed by item/colony, not by plan, and nothing ever cleared
// it — so ticks leaked across runs: calculate something else that shares a
// material and it came up pre-ticked. Identify the plan being worked on, and
// wipe the ticks only when the TARGET changes (not on every re-render, since a
// path switch or source pin re-runs the same plan and must keep its progress).
var PLAN_SIG_KEY = 'cmg_plan_sig_v1';
var LAST_PLAN_SIG = '';
try { LAST_PLAN_SIG = localStorage.getItem(PLAN_SIG_KEY) || ''; } catch (e) {}

// One-shot "just applied" marker, consumed by the very next render.
//
// This used to be a PERSISTED signature, which was wrong: a signature is not
// unique to one run. Applying 600 medkits at Paris permanently remembered
// "single|Paris|Emergency MediKit:600", so every later identical plan came back
// with the button already disabled and no way to apply it. The applied state
// describes THE RENDER THAT JUST HAPPENED, not the target, so it must be
// transient and must not survive a reload.
var APPLIED_ONCE = null;
// Evict the key the persisted version wrote, so anyone left with a stuck
// "✓ Applied" button from that build is freed on next load.
try { localStorage.removeItem('cmg_plan_applied_v1'); } catch (e) {}

function planSignature(itemOrTray, qty) {
  if (Array.isArray(itemOrTray)) {
    return 'multi|' + DESTINATION + '|' + itemOrTray.slice()
      .map(function (t) { return t.item + ':' + t.qty; }).sort().join(',');
  }
  return 'single|' + DESTINATION + '|' + itemOrTray + ':' + qty;
}

function clearPlanChecks() {
  TRANSFERS_DONE = {}; OBTAINED_DONE = {}; PRODUCE_DONE = {};
  saveTransfersDone(); saveObtainedDone(); saveProduceDone();
}

// Call before rendering. Returns true only for the single render that directly
// follows an apply — the flag is consumed here, so any later render of the same
// target (calculating it again, switching a path) offers Apply normally.
function syncPlanIdentity(sig) {
  if (sig !== LAST_PLAN_SIG) {
    clearPlanChecks();
    // A new plan means new work in every step, so anything that folded itself
    // shut on the previous run has to open back up.
    reopenAutoCollapsed();
    LAST_PLAN_SIG = sig;
    try { localStorage.setItem(PLAN_SIG_KEY, sig); } catch (e) {}
  }
  var justApplied = APPLIED_ONCE === sig;
  APPLIED_ONCE = null; // consume — never sticks around
  return justApplied;
}

// Flag the apply so the render it triggers shows the confirmation. Setting the
// button's text directly did nothing, because that render replaces the button.
function markPlanApplied(sig) {
  APPLIED_ONCE = sig;
  clearPlanChecks(); // the work is done; start the next run clean
  // Ticks are gone, so leaving sections folded-because-complete would contradict
  // the (now empty) checklist.
  reopenAutoCollapsed();
}

function toggleProduceCheck(cb) {
  var key = cb.dataset.produceKey;
  var card = cb.closest('.recipe-card');
  if (cb.checked) {
    PRODUCE_DONE[key] = true;
    if (card) card.classList.add('done');
  } else {
    delete PRODUCE_DONE[key];
    if (card) card.classList.remove('done');
  }
  saveProduceDone();
  // Auto-collapse section if all items in it are checked
  var section = card.closest('.section');
  if (section) autoCollapseIfDone(section);
}
window.toggleProduceCheck = toggleProduceCheck; // exported for inline onclick

// After a render, reflect already-completed sections (ticks are persisted, so a
// plan can come back part-finished). Styling only — no collapsing or flashing,
// which would fight the user's own collapse choices on load.
function markDoneSections(container) {
  if (!container) return;
  container.querySelectorAll('.section').forEach(function (section) {
    var cbs = section.querySelectorAll('input[type=checkbox]');
    if (!cbs.length) { section.classList.remove('done'); return; }
    var allDone = true;
    for (var i = 0; i < cbs.length; i++) { if (!cbs[i].checked) { allDone = false; break; } }
    section.classList.toggle('done', allDone);
  });
}

// Auto-collapse a section when all its checkboxes are ticked, mark it done, and
// point the user at whatever is left.
function autoCollapseIfDone(section) {
  var cbs = section.querySelectorAll('input[type=checkbox]');
  if (!cbs.length) return;
  var allDone = true;
  for (var i = 0; i < cbs.length; i++) { if (!cbs[i].checked) { allDone = false; break; } }

  // Completed sections recede (badge dims, pulse stops) — and un-ticking one
  // brings it back, so the state always reflects the checklist.
  section.classList.toggle('done', allDone);
  if (!allDone) return;

  var title = section.querySelector('.section-title');
  if (title && !title.classList.contains('collapsed')) {
    title.click();
    // Mark it AFTER the click: toggleSection() treats a toggle as a manual
    // choice and clears this flag, so setting it first would be undone.
    var key = section.dataset.section;
    if (key) { AUTO_COLLAPSED.add(key); saveAutoCollapsed(); }
  }

  // Fold it away, then flash the next section still outstanding so the eye
  // follows to the next job instead of hunting for where the page moved to.
  var sections = Array.prototype.slice.call(
    section.parentNode ? section.parentNode.querySelectorAll('.section') : []);
  var idx = sections.indexOf(section);
  for (var j = idx + 1; j < sections.length; j++) {
    if (sections[j].classList.contains('done')) continue;
    var next = sections[j];
    next.classList.add('flash-target');
    setTimeout(function (el) {
      return function () { el.classList.remove('flash-target'); };
    }(next), 1200);
    break;
  }
}

// ── Shared transport rendering (colony-grouped + checkboxes) ──
// Persisted checkbox state so users can tick off transfers as they complete them.
var TRANSFERS_DONE = {};
try { TRANSFERS_DONE = JSON.parse(localStorage.getItem('cmg_transfers_done_v1')) || {}; } catch (e) { TRANSFERS_DONE = {}; }
function saveTransfersDone() { try { localStorage.setItem('cmg_transfers_done_v1', JSON.stringify(TRANSFERS_DONE)); } catch (e) {} }

// item → colony the player chose to move it FROM. Mirrors OBTAIN_SITE in the
// Obtain section. Pushed into the engine, which honours it during allocation.
var TRANSPORT_SOURCE = {};
try { TRANSPORT_SOURCE = JSON.parse(localStorage.getItem('cmg_transport_source_v1')) || {}; } catch (e) { TRANSPORT_SOURCE = {}; }
function saveTransportSource() {
  try { localStorage.setItem('cmg_transport_source_v1', JSON.stringify(TRANSPORT_SOURCE)); } catch (e) {}
  if (window.ENGINE) window.ENGINE.TRANSPORT_SOURCE = TRANSPORT_SOURCE;
}
saveTransportSource(); // seed the engine with the stored preferences on load

// Pick a different source colony for one item, then re-plan so the whole
// allocation (and any knock-on trips) reflects the choice.
function pickTransportSource(chip) {
  var item = decodeURIComponent(chip.dataset.srcItem);
  var src = chip.dataset.src;
  if (!item || !src) return;
  if (TRANSPORT_SOURCE[item] === src) { delete TRANSPORT_SOURCE[item]; } // click a pinned chip to unpin
  else { TRANSPORT_SOURCE[item] = src; }
  saveTransportSource();
  if (CALC_TRAY.length) { runMultiPlan(); return; }
  if (!LAST_SINGLE || !LAST_SINGLE.item) return;
  // runCalculator() reads #calc-item / #calc-qty, not LAST_SINGLE. Those can
  // drift apart (the field is readonly but a later pick can change it), so
  // restore the plan we're actually looking at before re-running — otherwise a
  // chip click could re-plan a different item, or blank the pane entirely.
  document.getElementById('calc-item').value = LAST_SINGLE.item;
  document.getElementById('calc-qty').value = LAST_SINGLE.qty;
  runCalculator();
}

function toggleTransferCheck(cb) {
  var key = cb.dataset.transferKey;
  var card = cb.closest('.flow-card');
  if (cb.checked) {
    TRANSFERS_DONE[key] = true;
    if (card) card.classList.add('done');
  } else {
    delete TRANSFERS_DONE[key];
    if (card) card.classList.remove('done');
  }
  saveTransfersDone();
  // Fold the section once everything in it is ticked — Produce already did
  // this; Move and Obtain were simply never wired up.
  var section = card && card.closest('.section');
  if (section) autoCollapseIfDone(section);
}

function renderTransportSection(plan) {
  var transport = plan.transport;
  var entries = Object.entries(transport);
  if (!entries.length) return '<div class="muted">Nothing to move — no owned stock needed.</div>';

  // Group items by source colony: { Berlin: [{item, qty, totalQty}], Manhattan: [...] }
  var colonyGroups = {};
  entries.forEach(function (entry) {
    var name = entry[0], info = entry[1];
    info.from.forEach(function (colony) {
      if (!colonyGroups[colony]) colonyGroups[colony] = [];
      colonyGroups[colony].push({
        item: name,
        qty: info.fromQty[colony] || 0,
        totalQty: info.qty,
        // full breakdown so a split stack can spell out where the rest comes
        // from — otherwise the two halves sit in separate colony groups with
        // only a "/ total" suffix hinting they're related
        from: info.from,
        fromQty: info.fromQty
      });
    });
  });

  // Sort colonies alphabetically
  var colonies = Object.keys(colonyGroups).sort(function (a, b) { return a.localeCompare(b); });

  // Count total items for the header
  var totalItems = 0;
  colonies.forEach(function (c) { totalItems += colonyGroups[c].length; });

  // Call out split stacks up front — otherwise "5 transfers" reads as 5
  // different materials when some are one material collected from two colonies.
  var splitCount = entries.filter(function (e) { return e[1].from.length > 1; }).length;
  var html = '<div class="transport-summary">' + totalItems + ' transfer' + (totalItems !== 1 ? 's' : '') +
    ' from ' + colonies.length + ' colon' + (colonies.length !== 1 ? 'ies' : 'y') +
    (splitCount ? ' <span class="transport-split-note">· ' + splitCount + ' item' +
      (splitCount !== 1 ? 's' : '') + ' collected from more than one colony</span>' : '') +
    '</div>';

  colonies.forEach(function (colony) {
    var items = colonyGroups[colony];
    html += '<div class="transport-group">' +
      '<div class="transport-group-head">' +
        '<span class="transport-group-icon">📦</span>' +
        '<span class="transport-group-colony">' + esc(colony) + '</span>' +
        '<span class="transport-group-arrow">➜</span>' +
        '<span class="tag dest">' + esc(DESTINATION) + '</span>' +
        '<span class="transport-group-count">' + items.length + ' item' + (items.length !== 1 ? 's' : '') + '</span>' +
      '</div>' +
      '<div class="flow-grid">';

    items.forEach(function (t) {
      var key = t.item + '|' + colony;
      var done = !!TRANSFERS_DONE[key];
      var display = displayName(t.item);
      var ico = iconFor(t.item);

      // Every colony that actually holds this item, so the source is the
      // player's call — the allocator only guesses (nearest-to-plan, biggest
      // pile). Skip the destination: stock there never needs moving.
      var holders = (INV_LOCATIONS[t.item] || [])
        .filter(function (l) { return l.location !== DESTINATION && l.qty > 0; })
        .slice().sort(function (a, b) { return b.qty - a.qty; });
      // Chip state is derived from the ALLOCATION, not from which colony group
      // this card happens to sit in — a split stack renders one card per colony
      // and marking "the" source per card contradicted itself. Every card for an
      // item now shows the same picture: which colonies are being drawn from,
      // how much from each, and which one (if any) the player pinned.
      var pinned = TRANSPORT_SOURCE[t.item];
      var pickHtml = holders.length > 1
        ? '<div class="src-picks"><span class="src-picks-label">move from</span>' +
            holders.map(function (l) {
              var used = (t.fromQty && t.fromQty[l.location]) || 0;
              var isPinned = pinned === l.location;
              var cls = 'src-pick' + (used > 0 ? ' using' : '') + (isPinned ? ' pinned' : '');
              var title = isPinned
                ? 'Pinned — click to let the planner choose again'
                : (used > 0
                    ? 'Taking ' + fmt(used) + ' of ' + fmt(l.qty) + ' here — click to always start from ' + l.location
                    : l.location + ' holds ' + fmt(l.qty) + ' — click to take from here first');
              return '<button type="button" class="' + cls + '"' +
                ' data-src-item="' + encodeURIComponent(t.item) + '" data-src="' + esc(l.location) + '"' +
                ' aria-pressed="' + (isPinned ? 'true' : 'false') + '"' +
                ' title="' + esc(title) + '">' +
                (isPinned ? '<span class="src-pin" aria-hidden="true">📌</span>' : '') +
                esc(l.location) +
                ' <span class="src-pick-q">' + (used > 0 ? fmt(used) + '/' + fmt(l.qty) : fmt(l.qty)) + '</span>' +
                '</button>';
            }).join('') +
          '</div>'
        : '';

      // Spell out a split stack. The two halves live in different colony
      // groups, so without this the only clue is a faint "/ total" suffix.
      var splitHtml = '';
      if (t.from && t.from.length > 1) {
        var parts = t.from.slice().sort(function (a, b) {
          return (t.fromQty[b] || 0) - (t.fromQty[a] || 0);
        }).map(function (c) {
          return '<span class="split-part' + (c === colony ? ' here' : '') + '">' +
            fmt(t.fromQty[c] || 0) + ' <span class="split-where">' + esc(c) + '</span></span>';
        }).join('<span class="split-plus">+</span>');
        splitHtml = '<div class="split-note">' +
          '<span class="split-badge">split ' + t.from.length + '×</span>' + parts +
          '<span class="split-total">= ' + fmt(t.totalQty) + '</span></div>';
      }

      html += '<div class="flow-card move' + (done ? ' done' : '') + (t.from && t.from.length > 1 ? ' split' : '') + '">' +
        '<label class="transport-check">' +
          '<input type="checkbox" class="transfer-cb" data-transfer-key="' + esc(key) + '"' + (done ? ' checked' : '') + ' />' +
          '<span class="checkmark"></span>' +
        '</label>' +
        '<div class="flow-card-body">' +
          '<div class="flow-chip">' + ico + '<span class="flow-name">' + esc(display) + '</span>' +
            '<span class="flow-qty owned">' + fmt(t.qty) + (t.qty !== t.totalQty ? ' <span class="flow-qty-partial">/ ' + fmt(t.totalQty) + '</span>' : '') + '</span>' +
          '</div>' +
          splitHtml +
          pickHtml +
        '</div>' +
      '</div>';
    });

    html += '</div></div>';
  });

  return html;
}

// ── Shared "obtain" rendering (colony-grouped + checkboxes) ──
// Mirrors the transport section: group items under a mine-site colony and let
// users tick materials off as they gather them. Persisted separately.
var OBTAINED_DONE = {};
try { OBTAINED_DONE = JSON.parse(localStorage.getItem('cmg_obtained_done_v1')) || {}; } catch (e) { OBTAINED_DONE = {}; }
function saveObtainedDone() { try { localStorage.setItem('cmg_obtained_done_v1', JSON.stringify(OBTAINED_DONE)); } catch (e) {} }

// Per-material chosen mine site. A material can usually be mined at several
// colonies and the cheapest depends on who owns the colony and its tax rate —
// only the player knows that — so we let them pick and remember the choice.
var OBTAIN_SITE = {};
try { OBTAIN_SITE = JSON.parse(localStorage.getItem('cmg_obtain_site_v1')) || {}; } catch (e) { OBTAIN_SITE = {}; }
function saveObtainSite() { try { localStorage.setItem('cmg_obtain_site_v1', JSON.stringify(OBTAIN_SITE)); } catch (e) {} }

// Last computed plan per result container, so a site pick can re-render the
// obtain section in place without recomputing the whole plan.
var LAST_PLANS = {};

// ── Colonies tab ───────────────────────────────────────────────────────────
// Absorbs the old Worlds reference. One card per place in the game: what it
// mines, its welcome audio, and — where the calculator can actually cost
// production there — an editable tax rate and owner.
//
// The two name sets do NOT line up, which is why this is a union rather than a
// join. The worlds list is CamelCase and 22 long ('AndromedaCity'), the
// calculator's colonies come from mining sites and are spaced ('Andromeda').
// Eight overlap, six colonies have no world entry (Paris and Tokyo among them)
// and fourteen worlds are not places you can produce at.
var WORLD_NAMES = [
  'AndromedaCity','Aquatica','Arcturus','Aurelia','Berlin','BookersValley',
  'CeresDelta','Constantinople','DeMorgansCastle','DominionExodus','EpsilonEridani',
  'EspenParadise','Eurocore','KeplersDome','Moonbase','NewHaven',
  'Pegasi51','SolsOutpost','TerraVenture','TitanStation',
  'AmericanEnterprises','AsianCoalition'
];

function colNorm(s) { return String(s).replace(/[^a-zA-Z0-9]/g, '').toLowerCase(); }

// Build the union: every colony the calculator knows, plus every world.
function colonyRows() {
  var colonies = colonyList();
  var used = {};
  var rows = [];

  colonies.forEach(function (c) {
    var n = colNorm(c);
    var world = null;
    for (var i = 0; i < WORLD_NAMES.length; i++) {
      var wn = colNorm(WORLD_NAMES[i]);
      if (wn === n || wn.indexOf(n) === 0 || n.indexOf(wn) === 0) { world = WORLD_NAMES[i]; break; }
    }
    if (world) used[world] = true;
    rows.push({ name: c, colony: c, world: world, priced: true });
  });

  WORLD_NAMES.forEach(function (w) {
    if (used[w]) return;
    rows.push({ name: w.replace(/([A-Z])/g, ' $1').trim(), colony: null, world: w, priced: false });
  });

  return rows.sort(function (a, b) {
    if (a.priced !== b.priced) return a.priced ? -1 : 1;   // editable ones first
    return a.name.localeCompare(b.name);
  });
}

function renderColonies() {
  var grid = document.getElementById('col-grid');
  if (!grid) { updateColonyTaxNote(); return; }

  var mines = {};
  ((window.GAME_DATA && GAME_DATA.mining_sites) || []).forEach(function (s) {
    mines[s.location] = (mines[s.location] || []).concat(s.yields || []);
  });

  var q = (document.getElementById('col-search') || {}).value || '';
  q = q.trim().toLowerCase();
  var pricedOnly = !!(document.getElementById('col-priced-only') || {}).checked;

  // Search matches the ORE as well as the colony, which is what the old Mining
  // tab was for — "where do I dig cobalt" has to keep working now that its
  // table is gone.
  var rows = colonyRows().filter(function (r) {
    if (pricedOnly && !r.priced) return false;
    if (!q) return true;
    if (r.name.toLowerCase().indexOf(q) !== -1) return true;
    return ((r.colony && mines[r.colony]) || []).some(function (m) {
      return m.toLowerCase().indexOf(q) !== -1;
    });
  });

  grid.innerHTML = rows.map(function (r) {
    var own = r.colony ? isOwnColony(r.colony) : false;
    var rate = (r.colony && typeof COLONY_TAX[r.colony] === 'number') ? COLONY_TAX[r.colony] : 0;
    var enc = r.colony ? encodeURIComponent(r.colony) : '';
    var yields = (r.colony && mines[r.colony]) || [];

    var controls = r.priced
      ? '<div class="cc-controls">' +
          '<label class="cc-own" title="Set this colony owner; eligible spend can return to the selected faction">' +
            '<select multiple data-ct-own="' + enc + '" aria-label="Owners of ' + esc(r.name) + '">' +
              '<option value="">Owner not set</option>' +
              (window.ER_FACTIONS?.selectable || []).map(function (f) {
                var owners = colonyOwnerIds(r.colony);
                return '<option value="' + esc(f.id) + '"' + (owners.includes(f.id) ? ' selected' : '') + '>' + esc(f.name) + '</option>';
              }).join('') +
            '</select>' +
          '</label>' +
          '<span class="cc-rate">' +
            '<input type="number" min="0" max="500" step="5" value="' + rate + '" data-ct-tax="' + enc + '" aria-label="Tax percent at ' + esc(r.name) + '" />' +
            '<span class="cc-pct">% tax</span>' +
          '</span>' +
        '</div>'
      : '<div class="cc-controls cc-none muted">no production here — nothing to tax</div>';

    return '<div class="col-card' + (own ? ' cc-own-col' : '') + (r.priced ? '' : ' cc-info') + '">' +
      '<div class="cc-head">' +
        '<span class="cc-name">' + esc(r.name) + '</span>' +
        (own ? '<span class="cc-badge">' + esc(colonyOwnerIds(r.colony).map(function (id) { return window.factionById?.(id)?.name || id; }).join(' + ')) + '</span>' : '') +
        (rate > 0 ? '<span class="cc-taxbadge">' + rate + '%</span>' : '') +
      '</div>' +
      // ore chips carry the icon and how much you already hold, which is what
      // the Mining table added over a plain list of names
      '<div class="cc-mines">' + (yields.length
          ? yields.map(function (m) {
              var have = (window.INV_TOTAL && INV_TOTAL[m]) || 0;
              var hit = q && m.toLowerCase().indexOf(q) !== -1;
              return '<span' + (hit ? ' class="cc-hit"' : '') + '>' + iconFor(m) + esc(displayName(m)) +
                (have ? ' <b>' + fmt(have) + '</b>' : '') + '</span>';
            }).join('')
          : '<span class="muted">no mine data</span>') + '</div>' +
      controls +
      (r.world ? '<button class="faction-audio" onclick="playAudio(\'voice_extracted/' + r.world + '.ogg\',0.5)">🔊 Welcome</button>' : '') +
    '</div>';
  }).join('') || '<div class="muted" style="padding:1rem">No colonies match.</div>';

  var count = document.getElementById('col-count');
  if (count) count.textContent = rows.length + ' of ' + colonyRows().length;
  updateColonyTaxNote();
}
// adoptRemoteColonies() calls this by name when another member's change lands.
function renderColonyTax() { renderColonies(); }

// Two summaries now. The calculator's panel is slot dials, so it leads with
// those and mentions the destination's rate only because that also moves the
// cost. The Colonies tab reports the shared picture.
function updateColonyTaxNote() {
  var dest = DESTINATION;
  var rate = typeof COLONY_TAX[dest] === 'number' ? COLONY_TAX[dest] : 0;
  var taxed = colonyList().filter(function (c) { return taxRateFor(c) > 0; }).length;

  var note = document.getElementById('calc-tax-note');
  if (note) {
    note.textContent = '⚡' + ENERGY_LEVEL + ' energy  ❄' + COOLING_LEVEL + ' cooling' +
      ' · ' + dest + ' ' + rate + '%' +
      (isOwnColony(dest) ? ' (' + (window.factionById?.(activeFactionId())?.name || activeFactionId()) + ')' : '');
  }
  var slot = document.getElementById('slot-note');
  if (slot) {
    var add = slotUpkeep();
    slot.textContent = add > 0 ? '+' + fmtUC(add) + ' UC per batch' : 'no upkeep';
  }
  var sync = document.getElementById('col-sync-note');
  if (sync) {
    var owned = colonyList().filter(isOwnColony).length;
    sync.textContent = '· ' + owned + ' owned · ' + taxed + ' taxed · stored locally';
  }
}

// Energy/cooling sliders. Per-run settings, so these stay on the calculator
// while tax and ownership moved to the shared Colonies tab.
function renderSlotLevels() {
  var e = document.getElementById('slot-energy'), c = document.getElementById('slot-cooling');
  if (e) { e.value = ENERGY_LEVEL; }
  if (c) { c.value = COOLING_LEVEL; }
  // Shown as the LEVEL, not a percentage. The panel is marked 0–100%, but
  // players talk in levels — "5 energy, 0 cooling" — so the number here should
  // be the one that gets said out loud.
  var eo = document.getElementById('slot-energy-out'), co = document.getElementById('slot-cooling-out');
  if (eo) eo.textContent = ENERGY_LEVEL;
  if (co) co.textContent = COOLING_LEVEL;
  updateColonyTaxNote();
}

function onSlotLevelChange(el) {
  if (el.id === 'slot-energy') ENERGY_LEVEL = clampEnergy(el.value);
  else if (el.id === 'slot-cooling') COOLING_LEVEL = clampCooling(el.value);
  else return;
  saveSlotLevels();
  renderSlotLevels();
  if (CALC_TRAY.length) runMultiPlan();
  else if (document.querySelector('#calc-result .plan-summary')) runCalculator();
}

// One handler for both controls — recalculating so the cost card moves with it.
function onColonyTaxChange(el) {
  var taxFor = el.dataset.ctTax, ownFor = el.dataset.ctOwn;
  if (taxFor) {
    var v = Math.max(0, Math.min(500, parseInt(el.value, 10) || 0));
    COLONY_TAX[decodeURIComponent(taxFor)] = v;
    el.value = v;
    // 'change' fires on blur/Enter, so the edit is finished — safe to re-render
    // and let the card's rate badge catch up.
    renderColonies();
  } else if (ownFor) {
    var c = decodeURIComponent(ownFor);
    var owner = Array.from(el.selectedOptions || []).map(function (option) { return option.value; }).filter(Boolean);
    if (owner.length) COLONY_OWNER[c] = owner;
    else delete COLONY_OWNER[c];
    saveColonySettings();
    refreshEngineFactionContext();
    renderColonyTax();
  }
  saveColonySettings();
  updateColonyTaxNote();
  // Push the one colony that changed. Per-colony ops mean two members editing
  // different colonies at the same time merge cleanly instead of one winning.
  var colony = decodeURIComponent(taxFor || ownFor);
  if (typeof syncShared === 'function') syncShared('taxes', [colonyOp(colony)]);
  rerunActivePlan();
}

// Re-cost whatever is on screen. Used after a rate changes locally and after a
// change arrives from another member.
function rerunActivePlan() {
  if (CALC_TRAY.length) runMultiPlan();
  else if (document.querySelector('#calc-result .plan-summary')) runCalculator();
}

function toggleObtainCheck(cb) {
  var key = cb.dataset.obtainKey;
  var card = cb.closest('.flow-card');
  if (cb.checked) {
    OBTAINED_DONE[key] = true;
    if (card) card.classList.add('done');
  } else {
    delete OBTAINED_DONE[key];
    if (card) card.classList.remove('done');
  }
  saveObtainedDone();
  var section = card && card.closest('.section');
  if (section) autoCollapseIfDone(section);
}

// Handle a mine-site chip click: remember the choice and re-file the material
// under the chosen colony by re-rendering the obtain section in place.
function pickObtainSite(chip) {
  var item = chip.dataset.obtainItem, site = chip.dataset.site;
  if (!item || !site) return;
  OBTAIN_SITE[item] = site;
  saveObtainSite();
  var wrap = chip.closest('.acquire-wrap');
  var container = chip.closest('#calc-result, #calc-multi');
  var plan = container && LAST_PLANS[container.id];
  if (wrap && plan) {
    wrap.innerHTML = renderAcquireSection(plan);
    // The total-cost panel is computed from OBTAIN_SITE too — materials are
    // billed at the site they're mined at, so switching sites above moves the
    // headline number as well as the per-material line. Re-render it in place
    // (the plan itself is unchanged; only its costing changed).
    var top = container.querySelector('.plan-top');
    if (top) top.outerHTML = renderPlanStats(plan);
  }
}

function renderAcquireSection(plan) {
  var entries = Object.entries(plan.acquire);
  if (!entries.length) return '<div class="muted">Nothing to obtain — all inputs already owned.</div>';

  // A raw item can be obtained at any ONE of several mine sites (no per-site
  // split). File each material under the site the player picked (persisted), or
  // its first listed site by default. Items with no site go to a "No mine site"
  // bucket. Each material appears once, with its own persisted checkbox.
  var NO_SITE = 'No mine site';
  var groups = {};
  entries.forEach(function (e) {
    var name = e[0], info = e[1];
    var from = info.from || [];
    var chosen = (OBTAIN_SITE[name] && from.indexOf(OBTAIN_SITE[name]) !== -1)
      ? OBTAIN_SITE[name]
      : (from.length ? from[0] : NO_SITE);
    (groups[chosen] = groups[chosen] || []).push({ item: name, info: info, chosen: chosen });
  });

  var colonies = Object.keys(groups).sort(function (a, b) {
    if (a === NO_SITE) return 1;
    if (b === NO_SITE) return -1;
    return a.localeCompare(b);
  });

  var html = '<div class="transport-summary">' + entries.length + ' material' + (entries.length !== 1 ? 's' : '') +
    ' from ' + colonies.length + ' colon' + (colonies.length !== 1 ? 'ies' : 'y') + '</div>';

  colonies.forEach(function (colony) {
    var items = groups[colony].sort(function (a, b) { return a.item.localeCompare(b.item); });
    html += '<div class="transport-group">' +
      '<div class="transport-group-head">' +
        '<span class="transport-group-icon">⛏️</span>' +
        '<span class="transport-group-colony">' + esc(colony) + '</span>' +
        '<span class="transport-group-count">' + items.length + ' item' + (items.length !== 1 ? 's' : '') + '</span>' +
      '</div>' +
      '<div class="flow-grid">';

    items.forEach(function (t) {
      var info = t.info;
      var from = info.from || [];
      var done = !!OBTAINED_DONE[t.item];
      // Selectable mine sites — click one to mine this material there instead.
      var pickHtml = from.length
        ? '<div class="mine-picks"><span class="mine-picks-label">mine at</span>' +
            from.map(function (s) {
              return '<button type="button" class="mine-pick' + (s === t.chosen ? ' active' : '') + '"' +
                ' data-obtain-item="' + esc(t.item) + '" data-site="' + esc(s) + '"' +
                (s === t.chosen ? ' aria-pressed="true"' : ' aria-pressed="false"') + '>' + esc(s) + '</button>';
            }).join('') +
          '</div>'
        : '';

      html += '<div class="flow-card get' + (done ? ' done' : '') + '">' +
        '<label class="transport-check">' +
          '<input type="checkbox" class="obtain-cb" data-obtain-key="' + esc(t.item) + '"' + (done ? ' checked' : '') + ' />' +
          '<span class="checkmark"></span>' +
        '</label>' +
        '<div class="flow-card-body">' +
          '<div class="flow-chip">' + iconFor(t.item) + '<span class="flow-name">' + esc(displayName(t.item)) + '</span>' +
            '<span class="flow-qty need">' + fmt(info.qty) + '</span>' +
          '</div>' +
          '<div class="flow-need">obtain ' + fmt(info.qty) +
            (function () {
              // Materials are billed per unit, on top of the processing fees,
              // and taxed at the site this one is being mined at — so switching
              // sites above moves this number.
              var unit = materialUnitCost(t.item);
              if (unit == null) return '';
              var rate = taxRateFor(t.chosen);
              var gross = unit * info.qty * (1 + rate);
              return ' <span class="need-cost">' + fmtUC(gross) + ' UC</span>' +
                     '<span class="need-cost-sub"> @ ' + fmtUC(unit) +
                       (rate > 0 ? ' +' + Math.round(rate * 100) + '% tax' : '') + '</span>';
            })() +
          '</div>' +
          pickHtml +
        '</div>' +
      '</div>';
    });

    html += '</div></div>';
  });

  return html;
}

// ── Refinement-path picker (input controls, BEFORE calculation) ──
// The chosen path for an intermediate changes what raw materials the whole plan
// needs, so it belongs above the results, not buried in a produce step. Walk
// the selected item's recipe tree (recipe data only — no inventory needed) and
// collect every intermediate that has alternative input sets, following the
// paths currently chosen. Returns [{item, recipe}] in encounter order, unique.
function refinementPaths(finalItems) {
  // `actualAlt` is item → the index the ENGINE really used. When the player has
  // not picked a path, the engine scores the alternatives and takes the best —
  // it does NOT default to 0 — so walking with 0 explored the wrong branch and
  // could list the wrong set of pickers.
  var actualAlt = enginePathChoices();
  var found = [], foundSet = {}, seen = {};
  function walk(it) {
    if (seen[it]) return; seen[it] = true;
    var recs = RECIPES_BY_OUTPUT[it];
    if (!recs) return;
    var r = DATA.recipes[recs[0]._idx];
    var inputs;
    if (r.inputs_alternatives) {
      if (!foundSet[it]) { foundSet[it] = true; found.push({ item: it, recipe: r }); }
      var idx = resolvedAltIndex(it, actualAlt);
      inputs = r.inputs_alternatives[idx] || r.inputs_alternatives[0] || [];
    } else {
      inputs = r.inputs || [];
    }
    inputs.forEach(function (inp) { if (CRAFTABLE.has(inp.item)) walk(inp.item); });
  }
  finalItems.forEach(walk);
  return found;
}

// item → alternative index actually used by the plan on screen. The steps record
// altIndex, which is the ground truth; ALTERNATIVE_CHOICES only holds explicit
// picks and is empty until the player changes something.
function enginePathChoices() {
  var map = {};
  var plan = LAST_PLANS[CALC_TRAY.length ? 'calc-multi' : 'calc-result'];
  if (plan && plan.steps) {
    plan.steps.forEach(function (s) { if (s.altIndex != null) map[s.item] = s.altIndex; });
  }
  return map;
}

// Prefer what the engine used, then an explicit pick, then 0 as a last resort.
function resolvedAltIndex(item, actualAlt) {
  if (actualAlt && actualAlt[item] != null) return actualAlt[item];
  if (ALTERNATIVE_CHOICES[item] != null) return ALTERNATIVE_CHOICES[item];
  return 0;
}

// ── Refinement-path cost estimates ─────────────────────────────────────────
// UC cost of ONE UNIT of an intermediate via one of its alternative paths:
// the path's per-batch processing fee (costs.json items) plus its priced
// inputs, divided by the batch yield. Sub-inputs are priced at their cheapest
// priced path; raw materials at costs.json materials. Returns null when any
// link in the chain is unpriced — never invents a number (same strictness as
// costFor). Memoized per render, depth-capped against recipe cycles.
function estUnitCost(item, depth, memo) {
  depth = depth || 0;
  if (depth > 10) return null;
  if (Object.prototype.hasOwnProperty.call(memo, item)) return memo[item];
  var raw = materialUnitCost(item);
  if (raw != null) return memo[item] = raw;
  var recs = RECIPES_BY_OUTPUT[item];
  if (!recs || !recs.length) return memo[item] = null;
  var r = DATA.recipes[recs[0]._idx];
  var alts = r.inputs_alternatives || (r.inputs ? [r.inputs] : null);
  if (!alts) return memo[item] = null;
  var best = null;
  alts.forEach(function (alt, i) {
    var c = estPathCost(item, i, depth + 1, memo);
    if (c != null && (best == null || c < best)) best = c;
  });
  return memo[item] = best;
}

// Cost of one unit of `item` via the specific alternative path at `altIndex`.
// Single-path recipes (plain `inputs`) are treated as a one-element path list.
function estPathCost(item, altIndex, depth, memo) {
  var fee = costFor(item, altIndex);
  if (!fee || fee.uc == null || !fee.y) return null;
  var recs = RECIPES_BY_OUTPUT[item];
  if (!recs || !recs.length) return null;
  var r = DATA.recipes[recs[0]._idx];
  var alt = r.inputs_alternatives ? r.inputs_alternatives[altIndex] : (altIndex === 0 ? r.inputs : null);
  if (!alt) return null;
  var total = fee.uc;
  for (var j = 0; j < alt.length; j++) {
    var u = estUnitCost(alt[j].item, depth, memo);
    if (u == null) return null;
    total += u * alt[j].quantity;
  }
  return total / fee.y;
}

// Render the path pickers into the controls area for the item(s) currently
// queued (the tray if it has items, else the single search item).
function renderCalcPaths() {
  var box = document.getElementById('calc-paths');
  if (!box) return;
  var items;
  if (CALC_TRAY.length) {
    items = CALC_TRAY.map(function (t) { return t.item; });
  } else {
    var it = document.getElementById('calc-item').value.trim();
    // Fallback to LAST_SINGLE if the readonly field is somehow empty
    // (can happen if DOM replacement clears it before this runs)
    if (!it && LAST_SINGLE) it = LAST_SINGLE.item;
    items = (it && FINAL_ITEMS.includes(it)) ? [it] : [];
  }
  var paths = items.length ? refinementPaths(items) : [];
  if (!paths.length) { box.hidden = true; box.innerHTML = ''; return; }
  box.hidden = false;
  var actualAlt = enginePathChoices();
  var memo = {};
  // Per-path unit-cost estimate for every alternative shown below. Priced
  // options get "≈ N UC/unit"; the cheapest gets ★. Options stay readable when
  // a path is unpriced (no estimate) or the whole item is (no ★ at all).
  var itemCosts = paths.map(function (p) {
    return p.recipe.inputs_alternatives.map(function (a, i) {
      // Same estimator the engine's pickAlternativeIndex uses (net of the 85%
      // owner return at active-faction colonies), so the
      // ★ cheapest label always matches the path the plan actually picks.
      var net = (window.ENGINE && window.ENGINE.netPathCost) ? window.ENGINE.netPathCost(p.item, i, DESTINATION, {}, 0) : null;
      if (net != null) return net;
      return estPathCost(p.item, i, 1, memo);
    });
  });
  var anyPriced = itemCosts.some(function (costs) { return costs.some(function (c) { return c != null; }); });
  // Label reflects where this panel actually lives now: inside the plan card,
  // above the materials dashboard it drives (switching a path re-plans).
  box.innerHTML = '<div class="calc-paths-title"><span class="calc-paths-badge">⚙</span><span>Refinement paths</span><span class="calc-paths-hint">switch to change the materials below</span></div>' +
    '<div class="calc-path-flow" aria-hidden="true"><span></span><span></span><span></span></div>' +
    '<div class="calc-paths-list">' + paths.map(function (p, pi) {
      // Show the path the plan below is ACTUALLY built on. Defaulting to 0 made
      // the select read "5 chemicals" while the step used the auto-picked
      // "3 chemicals + 2 organic material + 1 water".
      var chosen = resolvedAltIndex(p.item, actualAlt);
      var costs = itemCosts[pi];
      var best = -1;
      costs.forEach(function (c, i) { if (c != null && (best < 0 || c < costs[best])) best = i; });
      var opts = p.recipe.inputs_alternatives.map(function (a, i) {
        var label = a.map(function (x) { return fmt(x.quantity) + ' ' + esc(x.item); }).join(' + ');
        var c = costs[i];
        if (c != null) {
          label += ' · ≈ ' + fmtUC(c) + ' UC/unit';
          if (i === best) label += ' ★ cheapest';
        } else if (anyPriced) {
          label += ' · cost n/a';
        }
        return '<option value="' + i + '"' + (i === chosen ? ' selected' : '') + '>' + label + '</option>';
      }).join('');
      return '<label class="calc-path-row">' +
        '<span class="calc-path-item">' + iconFor(p.item) + '<span>' + esc(displayName(p.item)) + '</span></span>' +
        '<select data-alt="' + encodeURIComponent(p.item) + '" aria-label="Refinement path for ' + esc(p.item) + '">' + opts + '</select>' +
      '</label>';
    }).join('') + '</div>' +
    (anyPriced ? '<div class="calc-paths-note">≈ estimated UC per unit — processing fee + materials, net of the 85% owner return where your selected faction owns the colony; tax is separate · ★ = cheapest priced path · prices are a snapshot, verify live in-game</div>' : '');
}

// ── Collapsible plan sections (persisted) ──
// Each plan section (Move / Obtain / Refinement / Manufacture) can be collapsed
// as you work through it. The state is keyed by section and persisted so it
// survives re-renders (path picks, recalcs, site changes).
var COLLAPSED_SECTIONS = new Set();
try { COLLAPSED_SECTIONS = new Set(JSON.parse(localStorage.getItem('cmg_collapsed_sections_v1')) || []); } catch (e) { COLLAPSED_SECTIONS = new Set(); }
function saveCollapsed() { try { localStorage.setItem('cmg_collapsed_sections_v1', JSON.stringify(Array.from(COLLAPSED_SECTIONS))); } catch (e) {} }

// Which sections were folded BY the completion logic rather than by the user.
// The two need telling apart: a section that auto-folded because its work was
// finished must reopen for the next plan (there is new work in it), whereas one
// the player collapsed by hand is a standing preference and should stay shut.
// Without this split, finishing a plan left every section folded and the next
// calculation came up with all its work hidden.
var AUTO_COLLAPSED = new Set();
try { AUTO_COLLAPSED = new Set(JSON.parse(localStorage.getItem('cmg_auto_collapsed_v1')) || []); } catch (e) { AUTO_COLLAPSED = new Set(); }
function saveAutoCollapsed() { try { localStorage.setItem('cmg_auto_collapsed_v1', JSON.stringify(Array.from(AUTO_COLLAPSED))); } catch (e) {} }

// Reopen everything that auto-folded; leave the player's own choices alone.
function reopenAutoCollapsed() {
  if (!AUTO_COLLAPSED.size) return;
  AUTO_COLLAPSED.forEach(function (key) { COLLAPSED_SECTIONS.delete(key); });
  AUTO_COLLAPSED.clear();
  saveCollapsed(); saveAutoCollapsed();
}

// ── Mining slots at the production colony ──────────────────────────────────
// A planet gives you 4 slots: 2 mining and 2 refinement/production. While the
// production pair is busy with the plan, the mining pair is idle, so this lists
// what can be dug up right here — flagging what the current plan still needs,
// and letting the rest be banked for later. Mining in full 100s is roughly 25%
// cheaper per unit, so that's the default action.
var MINE_BATCH = 100;

function renderMiningPanel(plan) {
  var yields = [];
  DATA.mining_sites.forEach(function (s) {
    if (s.location !== DESTINATION) return;
    (s.yields || []).forEach(function (y) { if (yields.indexOf(y) === -1) yields.push(y); });
  });
  if (!yields.length) {
    return '<div class="mine-slots"><div class="mine-slots-head">⛏ Mining slots</div>' +
      '<div class="muted mine-slots-none">' + esc(DESTINATION) + ' has no mine site — nothing to dig here while production runs.</div></div>';
  }

  var acquire = (plan && plan.acquire) || {};
  var atDest = {};
  getInv().forEach(function (e) {
    if (e.location === DESTINATION) atDest[e.item] = (atDest[e.item] || 0) + e.quantity;
  });

  // What this plan still needs comes first — that's the mining worth doing now.
  yields.sort(function (a, b) {
    var na = (acquire[a] && acquire[a].qty) || 0, nb = (acquire[b] && acquire[b].qty) || 0;
    return nb - na || a.localeCompare(b);
  });

  var rows = yields.map(function (item) {
    var need = (acquire[item] && acquire[item].qty) || 0;
    var have = atDest[item] || 0;
    var enc = encodeURIComponent(item);
    return '<div class="mine-row' + (need > 0 ? ' wanted' : '') + '">' +
      '<span class="mine-row-item">' + iconFor(item) +
        '<span class="mine-row-name">' + esc(displayName(item)) + '</span></span>' +
      (need > 0 ? '<span class="mine-need">plan needs ' + fmt(need) + '</span>'
                : '<span class="mine-need muted">for later</span>') +
      '<span class="mine-have">' + (have > 0 ? fmt(have) + ' here' : '') + '</span>' +
      '<span class="mine-acts">' +
        '<button type="button" class="mine-log full" data-mine="' + enc + '" data-qty="' + MINE_BATCH + '"' +
          ' title="Log a full batch — best rate per unit">+' + MINE_BATCH + '</button>' +
        '<button type="button" class="mine-log" data-mine="' + enc + '" data-qty="50">+50</button>' +
        '<button type="button" class="mine-log" data-mine="' + enc + '" data-qty="25">+25</button>' +
        '<input type="number" class="mine-qty" min="1" max="' + MINE_BATCH + '" placeholder="1-' + MINE_BATCH + '"' +
          ' data-mine-qty="' + enc + '" aria-label="Custom amount mined of ' + esc(item) + '" />' +
      '</span>' +
    '</div>';
  }).join('');

  return '<div class="mine-slots">' +
    '<div class="mine-slots-head">⛏ Mining slots at ' + esc(DESTINATION) +
      '<span class="mine-slots-hint">2 slots free while production runs · a full ' + MINE_BATCH +
      ' costs about 25% less per unit than smaller pulls</span></div>' +
    rows +
    '<div class="mine-slots-foot muted">Logged straight into your stock here, and the plan above re-calculates.</div>' +
  '</div>';
}

// Record a mined haul at the production colony and re-plan so the numbers move.
function logMined(item, qty) {
  qty = Math.max(1, Math.min(MINE_BATCH, parseInt(qty, 10) || 0));
  if (!item || !ALL_ITEMS.has(item)) return;
  applyEntry(item, DESTINATION, qty, 'add');
  var now = getInv()
    .filter(function (e) { return e.item === item && e.location === DESTINATION; })
    .reduce(function (s, e) { return s + e.quantity; }, 0);
  toast('Mined ' + fmt(qty) + ' ' + displayName(item) + ' at ' + DESTINATION + ' (now ' + fmt(now) + ').',
    2500, 'success');
  if (CALC_TRAY.length) runMultiPlan();
  else if (LAST_SINGLE && LAST_SINGLE.item) {
    document.getElementById('calc-item').value = LAST_SINGLE.item;
    document.getElementById('calc-qty').value = LAST_SINGLE.qty;
    runCalculator();
  }
}

// Build a numbered, collapsible section. Content lives in .section-content so
// the title stays visible/clickable when collapsed.
function planSection(key, stepNum, titleText, contentHtml) {
  var collapsed = COLLAPSED_SECTIONS.has(key);
  return '<div class="section step-' + stepNum + '" data-section="' + key + '">' +
    '<div class="section-badge" aria-hidden="true">' + stepNum + '</div>' +
    '<div class="section-body">' +
      '<div class="section-title' + (collapsed ? ' collapsed' : '') + '" role="button" tabindex="0"' +
        ' aria-expanded="' + (collapsed ? 'false' : 'true') + '">' + titleText + '</div>' +
      '<div class="section-content' + (collapsed ? ' collapsed' : '') + '">' + contentHtml + '</div>' +
    '</div></div>';
}

// Toggle a section from its title element; persist the new state.
function toggleSection(title) {
  var section = title.closest('.section');
  if (!section) return;
  var content = section.querySelector('.section-content');
  var key = section.dataset.section;
  var collapsed = title.classList.toggle('collapsed');
  if (content) content.classList.toggle('collapsed', collapsed);
  title.setAttribute('aria-expanded', String(!collapsed));
  if (key) {
    if (collapsed) COLLAPSED_SECTIONS.add(key); else COLLAPSED_SECTIONS.delete(key);
    saveCollapsed();
    // A hand toggle makes this the player's call from now on, so it stops being
    // treated as auto-folded and survives the next calculation.
    if (AUTO_COLLAPSED.delete(key)) saveAutoCollapsed();
  }
}

function renderPlan(item, qty, targetEl) {
  if (!FINAL_ITEMS.includes(item)) {
    targetEl.innerHTML = '<div class="card"><span class="shortfall">That is not a final item. The calculator is for end products (medkits, ammo, foams, etc.). It is produced as an intermediate of another recipe — compute that final item instead.</span></div>';
    return false;
  }
  // New target? Start with a clean checklist. Same target (path switch, source
  // pin, post-apply re-render) keeps whatever progress is already ticked.
  const planSig = planSignature(item, qty);
  const planApplied = syncPlanIdentity(planSig);
  const altChoices = Object.assign({}, ALTERNATIVE_CHOICES);
  const discounts = getDiscounts();
  let result, plan;
  try {
    result = compute(item, qty, altChoices, Object.assign({}, INV_TOTAL), INV_LOCATIONS, DESTINATION, discounts);
    plan = result.plan;
    if (targetEl && targetEl.id) LAST_PLANS[targetEl.id] = plan;
  } catch (e) {
    console.error('Compute error:', e);
    targetEl.innerHTML = '<div class="card"><span class="shortfall">Couldn\'t plan this item — it may have a recipe cycle or missing data. Check the console for details.</span></div>';
    return false;
  }

  // ---- 1) TRANSPORT ----
  const transportHtml = renderTransportSection(plan);

  // ---- 2) ACQUIRE ----
  const acquireHtml = '<div class="acquire-wrap">' + renderAcquireSection(plan) + '</div>';

  // ---- 3) PRODUCE ----
  const refineHtml = plan.refine.length
    ? plan.refine.map(s => stepCard(s)).join('')
    : '';
  const manufactureHtml = plan.manufacture.map(s => stepCard(s, true)).join('');
  const hasRefine = plan.refine.length > 0;
  const manuStep = hasRefine ? 4 : 3;

  // Stock of the requested item no longer cancels the request — the plan always
  // makes the amount asked for — so this is now purely informational.
  const alreadyHave = INV_TOTAL[item] || 0;
  const dashboardHtml = renderMaterialDashboard(plan);
  const statsHtml = `<details class="expert-details"><summary>Detailed costs, batches, and per-unit pricing</summary>${renderPlanStats(plan)}</details>`;
  const beginnerCost = planCost(plan);
  const beginnerAcquire = Object.values(plan.acquire).reduce((sum, row) => sum + row.qty, 0);
  const beginnerSteps = plan.refine.length + plan.manufacture.length;
  const beginnerHtml = `<section class="beginner-summary" aria-label="Plan at a glance">
    <div><span class="eyebrow">Plan at a glance</span><h3>${fmt(qty)} × ${esc(displayName(item))} at ${esc(DESTINATION)}</h3></div>
    <div class="beginner-kpis"><span><b>${fmt(beginnerAcquire)}</b> material units to obtain</span><span><b>${fmt(beginnerSteps)}</b> production steps</span><span><b>${fmtUC(beginnerCost.grand)}</b> Estimated investment</span></div>
    <div class="beginner-next"><b>What to do next</b><span>1. Obtain missing materials</span><span>2. Refine intermediates</span><span>3. Manufacture the final item</span></div>
    <details><summary>What do these numbers mean?</summary><p>Investment is the estimated up-front spend. Cost per unit divides the plan's actual costs by output. When your selected faction owns a mining or production colony, 85% of the pre-tax spend returns to that faction. The remaining 15% goes to the Global Dominion; the displayed 50/50 FDC/LED allocation is an assumption.</p></details>
  </section>`;

  const drugRef = (DATA.drugs || []).find(d => d.name === item);
  const drugPlanHtml = drugRef ? `
    <div class="plan-drug">
      <span class="plan-drug-item"><span class="plan-drug-k">Power</span> <span class="tag tier-${esc(String(drugRef.tier || '').toLowerCase())}">${esc(drugRef.tier)}</span></span>
      ${drugRef.positive ? `<span class="drug-pos">${esc(drugRef.positive)}</span>` : ''}
      ${drugRef.negative ? `<span class="drug-neg">${esc(drugRef.negative)}</span>` : ''}
      <span class="plan-drug-cost">Processing <b>${fmt(drugRef.processing_cost)}</b> + ChemSub <b>${fmt(drugRef.chemsub_cost)}</b> = <b class="plan-drug-total">${fmt(drugRef.total_uc)} UC</b></span>
    </div>` : '';

  targetEl.innerHTML = `
    <div class="plan-summary">
      <div class="plan-summary-main">
        <span class="plan-summary-icon">${iconFor(item)}</span>
        <span class="plan-summary-title">${esc(displayName(item))}</span>
        <span class="plan-summary-qty">× ${fmt(qty)}</span>
        <span class="plan-summary-arrow">→</span>
        <span class="plan-summary-dest">${esc(DESTINATION)}</span>
      </div>
    </div>
    <div class="card plan">
      <div class="plan-hero-note${alreadyHave > 0 ? ' has-stock' : ''}">${alreadyHave > 0
        ? 'Holding <b>' + fmt(alreadyHave) + '</b> · plan makes <b>' + fmt(qty) + '</b> more → <b>' + fmt(alreadyHave + qty) + '</b> total. Existing stock is left alone.'
        : 'This plan produces <b>' + fmt(qty) + '</b>.'}</div>
      ${beginnerHtml}
      ${drugPlanHtml}
      ${statsHtml}
      <div id="calc-paths" class="calc-paths" hidden></div>
      ${dashboardHtml}

      ${planSection('move', 1, 'Move owned stock to ' + esc(DESTINATION), transportHtml)}
      ${planSection('obtain', 2, 'Obtain missing materials', acquireHtml)}
      ${hasRefine ? planSection('refine', 3, 'Refinement at ' + esc(DESTINATION), refineHtml) : ''}
      ${planSection('manufacture', manuStep, 'Manufacture at ' + esc(DESTINATION),
        (drugRef ? `<div class="prod-code"><span class="prod-code-label">Production Code</span><span class="prod-code-val">${esc(String(drugRef.code))}</span><span class="prod-code-power"><span class="prod-code-label">Power</span><span class="tag tier-${esc(String(drugRef.tier || '').toLowerCase())}">${esc(drugRef.tier)}</span></span></div>` : '') + manufactureHtml)}
      ${renderMiningPanel(plan)}
      ${planApplied
        ? `<button class="apply-plan applied" disabled title="Applied. Press Calculate again to plan another run of this.">✓ Applied to inventory</button>`
        : `<button class="apply-plan" data-apply="${encodeURIComponent(item)}" data-qty="${qty}">Apply plan → inventory</button>`}
    </div>
    <div class="plan-actions">
      <button class="ghost copy-list">📋 Copy shopping list</button>
      <button class="ghost share-plan">🔗 Share plan link</button>
    </div>
    <div class="plan-legend">
      <span class="legend-chip legend-move"></span> Move from colony &nbsp;
      <span class="legend-chip legend-get"></span> Obtain (mine/purchase) &nbsp;
      <span class="legend-chip legend-produce"></span> Produce (refine/manufacture) &nbsp;
      <span class="legend-chip legend-surplus"></span> Batch surplus
    </div>`;
  return true;
}

function runCalculator() {
  const item = document.getElementById('calc-item').value.trim();
  const qty = Math.max(1, parseInt(document.getElementById('calc-qty').value, 10) || 1);
  const out = document.getElementById('calc-result');
  document.getElementById('calc-result').classList.remove('multi');
  document.getElementById('calc-multi').innerHTML = '';
  getDestination(); // sync from input
  if (!item || !ALL_ITEMS.has(item)) {
    out.innerHTML = '<div class="card"><span class="shortfall">Select a valid item from the list.</span></div>';
    window.CMG_VALUE_TRANSITION?.announce({ item: 'Production plan', quantity: 1, result: out });
    return;
  }
  // Plan from scratch = empty ledger, ignore inventory (engine mirror too,
  // so alternative-path auto-picking also sees an empty inventory)
  const scratch = document.getElementById('calc-scratch')?.checked;
  let ok;
  if (scratch) {
    // INV_TOTAL/INV_LOCATIONS are const Proxies over window.STORE — rebinding
    // them throws "Assignment to constant variable" (that was silently killing
    // this whole path). Swap the underlying STORE objects instead: the Proxies
    // and the engine's alternative-path picker both read through to them, so
    // compute() and auto-picking all see an empty inventory. Restored below.
    const STORE = window.STORE;
    const tmpTotal = STORE.INV_TOTAL, tmpLocs = STORE.INV_LOCATIONS;
    STORE.INV_TOTAL = {}; STORE.INV_LOCATIONS = {};
    try {
      ok = renderPlan(item, qty, out);
    } finally {
      STORE.INV_TOTAL = tmpTotal; STORE.INV_LOCATIONS = tmpLocs;
    }
  } else {
    ok = renderPlan(item, qty, out);
  }
  if (ok) {
    LAST_SINGLE = { item, qty };
    pushRecent(item, qty);
    out.tabIndex = -1;
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
    out.focus({ preventScroll: true });
  }
  markDoneSections(out);
  renderCalcPaths();
  updateShareLink();
  window.CMG_VALUE_TRANSITION?.markChanged(out);
  window.CMG_VALUE_TRANSITION?.announce({ item, quantity: qty, result: out });
}

// ---- Multi-item tray ----
const TRAY_KEY = 'cmg_tray_v1';
let CALC_TRAY = [];
try { CALC_TRAY = JSON.parse(localStorage.getItem(TRAY_KEY)) || []; } catch (e) { CALC_TRAY = []; }

function saveTray() { try { localStorage.setItem(TRAY_KEY, JSON.stringify(CALC_TRAY)); } catch (e) {} }

// Saved plans
const SAVED_PLANS_KEY = 'er_saved_plans_v1';
let SAVED_PLANS = [];
try { SAVED_PLANS = JSON.parse(localStorage.getItem(SAVED_PLANS_KEY)) || []; } catch (e) { SAVED_PLANS = []; }
function saveSavedPlans() { try { localStorage.setItem(SAVED_PLANS_KEY, JSON.stringify(SAVED_PLANS)); } catch (e) {} }

function renderTray() {
  const tray = document.getElementById('calc-tray');
  tray.hidden = CALC_TRAY.length === 0;
  document.getElementById('tray-count').textContent = CALC_TRAY.length;
  document.getElementById('tray-items').innerHTML = CALC_TRAY.map((t, i) =>
    `<div class="tray-chip"><span class="tray-ic">${iconFor(t.item)}</span><span class="tray-nm">${esc(displayName(t.item))}</span>
       <span class="tray-q">×<input type="number" min="1" value="${t.qty}" data-tray-q="${i}" class="tray-qin" aria-label="Quantity for ${esc(t.item)}"/></span>
       <button class="tray-x" data-tray-x="${i}" title="Remove ${esc(t.item)}" aria-label="Remove ${esc(t.item)} from plan">✕</button></div>`).join('');
  renderCalcPaths();
}

function addToTray(item, qty) {
  if (item === undefined) item = document.getElementById('calc-item').value.trim();
  if (qty === undefined) qty = Math.max(1, parseInt(document.getElementById('calc-qty').value, 10) || 1);
  if (!item || !ALL_ITEMS.has(item)) { toast('Pick a valid item first.'); return; }
  if (!FINAL_ITEMS.includes(item)) { toast(item + ' is not a final product — add a final item to the plan.'); return; }
  const ex = CALC_TRAY.find(t => t.item === item);
  if (ex) ex.qty += qty; else CALC_TRAY.push({ item, qty });
  saveTray(); renderTray();
}

// ---- Combined multi-item plan with shared ledger (FIXED) ----
function runMultiPlan() {
  if (CALC_TRAY.length === 0) { toast('Add at least one item to the plan.'); return; }
  const out = document.getElementById('calc-multi');
  const single = document.getElementById('calc-result');
  single.innerHTML = ''; single.classList.remove('multi');
  // Same identity handling as the single plan — clean checklist on a new tray.
  const planSig = planSignature(CALC_TRAY);
  const planApplied = syncPlanIdentity(planSig);

  // Build a shared ledger from current inventory
  const ledger = Object.assign({}, INV_TOTAL);
  const invLoc = {};
  for (const k in INV_LOCATIONS) invLoc[k] = INV_LOCATIONS[k].map(l => ({ ...l }));

  // Compute all items against the shared ledger
  const discounts = getDiscounts();
  let result, plan;
  try {
    result = compute(CALC_TRAY, ALTERNATIVE_CHOICES, ledger, invLoc, DESTINATION, discounts);
    plan = result.plan;
    LAST_PLANS['calc-multi'] = plan;
  } catch (e) {
    console.error('Multi-plan compute error:', e);
    // There is no id="plan" element — this used to throw a TypeError inside the
    // catch, masking the real compute error and leaving the user with a blank
    // pane. The combined plan renders into `out` (#calc-multi).
    out.innerHTML = '<div class="card"><span class="shortfall">Couldn\'t plan these items — one may have a recipe cycle or missing data. Check the console for details.</span></div>';
    return;
  }

  let html = `<div class="multi-head">Combined production plan · ${CALC_TRAY.length} item(s) → ${esc(DESTINATION)}</div>`;

  // Dashboard + stats for combined plan
  const statsHtml = renderPlanStats(plan);
  const dashboardHtml = renderMaterialDashboard(plan);
  if (statsHtml) html += statsHtml;
  if (dashboardHtml) html += dashboardHtml;

  // ---- Sections (combined) — same 4 collapsible steps as the single plan ----
  const mTransport = renderTransportSection(plan);
  const mAcquire = '<div class="acquire-wrap">' + renderAcquireSection(plan) + '</div>';
  const mRefine = plan.refine.length ? plan.refine.map(s => stepCard(s)).join('') : '<div class="muted">No intermediates to refine.</div>';
  const mManufacture = plan.manufacture.length ? plan.manufacture.map(s => stepCard(s, true)).join('') : '<div class="muted">No manufacturing step.</div>';
  html += planSection('move', 1, 'Move owned stock to ' + esc(DESTINATION), mTransport);
  html += planSection('obtain', 2, 'Obtain missing materials', mAcquire);
  html += planSection('refine', 3, 'Refinement at ' + esc(DESTINATION), mRefine);
  html += planSection('manufacture', 4, 'Manufacture at ' + esc(DESTINATION), mManufacture);
  html += renderMiningPanel(plan);

  out.innerHTML = html;
  if (CALC_TRAY.length) {
    out.innerHTML += `${planApplied
      ? `<button class="apply-plan applied" disabled title="Applied. Press Build combined plan again to plan another run.">✓ Applied to inventory</button>`
      : `<button class="apply-plan primary" id="apply-multi">Apply combined plan → inventory</button>`}
    <div class="plan-actions">
      <button class="ghost copy-list">📋 Copy shopping list</button>
      <button class="ghost share-plan">🔗 Share plan link</button>
    </div>
    <div class="plan-legend">
      <span class="legend-chip legend-move"></span> Move from colony &nbsp;
      <span class="legend-chip legend-get"></span> Obtain (mine/purchase) &nbsp;
      <span class="legend-chip legend-produce"></span> Produce &nbsp;
      <span class="legend-chip legend-surplus"></span> Batch surplus
    </div>`;
  }
  markDoneSections(out);
  out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  renderCalcPaths();
  updateShareLink();
  window.CMG_VALUE_TRANSITION?.markChanged(out);
  window.CMG_VALUE_TRANSITION?.announce({ item: 'Combined production plan', quantity: CALC_TRAY.length, result: out });
}

// ── Saved production plans ──

function saveCurrentPlan() {
  let plan;
  if (CALC_TRAY.length) {
    plan = { kind: 'tray', tray: CALC_TRAY.map(t => ({ item: t.item, qty: t.qty })) };
  } else if (LAST_SINGLE && LAST_SINGLE.item) {
    plan = { kind: 'single', item: LAST_SINGLE.item, qty: LAST_SINGLE.qty };
  } else {
    toast('Nothing to save — calculate an item or add items to the plan first.');
    return;
  }
  const name = (prompt('Name this plan:', plan.kind === 'tray'
    ? `Tray (${CALC_TRAY.length} items)` : displayName(plan.item)) || '').trim();
  if (!name) return;
  plan.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  plan.name = name;
  plan.dest = DESTINATION;
  plan.created_at = Date.now();
  SAVED_PLANS.unshift(plan);
  saveSavedPlans();
  renderSavedPlans();
  toast(`Saved plan "${name}".`);
}

function loadSavedPlan(id) {
  const p = SAVED_PLANS.find(x => x.id === id);
  if (!p) return;
  const destSel = document.getElementById('calc-dest');
  if (destSel && p.dest) { destSel.value = p.dest; DESTINATION = p.dest; window.ENGINE.DESTINATION = p.dest; }
  if (p.kind === 'tray') {
    CALC_TRAY = p.tray.map(t => ({ item: t.item, qty: t.qty }));
    saveTray(); renderTray(); runMultiPlan();
  } else {
    document.getElementById('calc-item').value = p.item;
    document.getElementById('calc-qty').value = Math.max(1, p.qty || 1);
    runCalculator();
  }
  toast(`Loaded plan "${p.name}".`);
}

function renderSavedPlans() {
  const panel = document.getElementById('calc-saved');
  const list = document.getElementById('calc-saved-list');
  if (!panel || !list) return;
  panel.hidden = SAVED_PLANS.length === 0;
  list.innerHTML = SAVED_PLANS.map(p => {
    const meta = p.kind === 'tray'
      ? `${p.tray.length} items → ${esc(p.dest || '')}`
      : `${fmt(p.qty)} × ${esc(displayName(p.item))} → ${esc(p.dest || '')}`;
    return `<div class="saved-plan">
      <div class="sp-info"><span class="sp-name">${esc(p.name)}</span>
        <span class="sp-meta">${meta}</span></div>
      <div class="sp-actions">
        <button class="ghost" data-sp-load="${p.id}">Load</button>
        <button class="ghost" data-sp-del="${p.id}" title="Delete" style="color:var(--bad)">×</button>
      </div></div>`;
  }).join('');
  list.querySelectorAll('[data-sp-load]').forEach(b =>
    b.addEventListener('click', () => loadSavedPlan(b.dataset.spLoad)));
  list.querySelectorAll('[data-sp-del]').forEach(b =>
    b.addEventListener('click', () => {
      SAVED_PLANS = SAVED_PLANS.filter(x => x.id !== b.dataset.spDel);
      saveSavedPlans(); renderSavedPlans();
    }));
}

// moved to src/views/inventory.js

// moved to src/views/player.js

// moved to src/app-core.js (setView + THEME)

// moved to src/views/gear.js


// ═══════════════════════════════════════════════════════════════════════════
// § INIT — DOMContentLoaded: all event wiring, keyboard shortcuts, tab nav
// ═══════════════════════════════════════════════════════════════════════════
// moved to src/app-init.js
