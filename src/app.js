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
 * LOAD ORDER: game_data → store → engine → app-core → app.js → views/* → app-init
 *             (Chart.js and the 3D payloads are NOT part of the entry — they
 *              load on demand via the src/ui/*-loader.js stubs)
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

// Player-facing production progress is separate from inventory and the plan's
// calculated totals. It survives re-renders and refreshes, but is cleared when
// the current plan changes or is applied.
var PRODUCTION_PROGRESS = {};
try { PRODUCTION_PROGRESS = JSON.parse(localStorage.getItem('cmg_production_progress_v1')) || {}; } catch (e) { PRODUCTION_PROGRESS = {}; }
var PRODUCTION_PROGRESS_CHUNK = 100;
function saveProductionProgress() {
  try { localStorage.setItem('cmg_production_progress_v1', JSON.stringify(PRODUCTION_PROGRESS)); } catch (e) {}
}
function nextProductionProgress(completed, total, chunk) {
  var done = Math.max(0, Math.min(total, Number(completed) || 0));
  var size = Math.max(1, Number(chunk) || PRODUCTION_PROGRESS_CHUNK);
  var advanced = Math.min(size, Math.max(0, total - done));
  done += advanced;
  return { completed: done, remaining: Math.max(0, total - done), advanced: advanced };
}
function productionProgressFor(item, total) {
  return Math.max(0, Math.min(total, Math.floor(Number(PRODUCTION_PROGRESS[item]) || 0)));
}
function clearProductionProgress() {
  PRODUCTION_PROGRESS = {};
  saveProductionProgress();
}

// Mining progress is a player-facing checklist separate from inventory and plan
// totals. Each recorded haul updates only MINING_PROGRESS and the visible tracker.
var MINING_PROGRESS = {};
try { MINING_PROGRESS = JSON.parse(localStorage.getItem('cmg_mining_progress_v1')) || {}; } catch (e) { MINING_PROGRESS = {}; }
function saveMiningProgress() {
  try { localStorage.setItem('cmg_mining_progress_v1', JSON.stringify(MINING_PROGRESS)); } catch (e) {}
}
function miningProgressFor(item, total) {
  return Math.max(0, Math.min(total, Math.floor(Number(MINING_PROGRESS[item]) || 0)));
}
function clearMiningProgress() {
  MINING_PROGRESS = {};
  saveMiningProgress();
}

// Update only the visible tracker after a click; the full production plan stays
// intact so its original inputs, cost, and total output remain referenceable.
function updateProductionProgressCard(card, item, total, chunk) {
  if (!card) return;
  var tracker = card.querySelector('.production-progress');
  if (!tracker) return;
  var done = productionProgressFor(item, total);
  var remaining = Math.max(0, total - done);
  var next = Math.min(Math.max(1, Number(chunk) || PRODUCTION_PROGRESS_CHUNK), remaining);
  var count = tracker.querySelector('[data-progress-count]');
  var left = tracker.querySelector('[data-progress-remaining]');
  var fill = tracker.querySelector('[data-progress-fill]');
  var bar = tracker.querySelector('[role="progressbar"]');
  var run = tracker.querySelector('.progress-run');
  var reset = tracker.querySelector('.progress-reset');
  if (count) count.textContent = done + ' / ' + total + ' batches complete';
  if (left) left.textContent = remaining + ' remaining';
  if (fill) fill.style.width = (total ? Math.round(done / total * 100) : 0) + '%';
  if (bar) bar.setAttribute('aria-valuenow', done);
  if (run) {
    run.disabled = remaining === 0;
    run.textContent = remaining === 0
      ? 'All batches recorded'
      : 'Record ' + (next === remaining ? 'final ' : 'next ') + next + ' batch' + (next === 1 ? '' : 'es');
  }
  if (reset) reset.hidden = done === 0;
  tracker.classList.toggle('complete', remaining === 0);
  if (card) {
    var checkbox = card.querySelector('input[data-produce-key]');
    var compact = total > 0 && remaining === 0 && (!checkbox || checkbox.checked);
    card.classList.toggle('progress-complete', compact);
  }
}
function recordProductionProgress(button) {
  var item = decodeURIComponent(button.dataset.progressItem || '');
  var total = Math.max(0, parseInt(button.dataset.progressTotal, 10) || 0);
  var chunk = Math.max(1, parseInt(button.dataset.progressChunk, 10) || PRODUCTION_PROGRESS_CHUNK);
  if (!item || !total) return;
  var state = nextProductionProgress(productionProgressFor(item, total), total, chunk);
  if (!state.advanced) return;
  PRODUCTION_PROGRESS[item] = state.completed;
  saveProductionProgress();
  var card = button.closest('.recipe-card');
  if (state.remaining === 0 && card) {
    var checkbox = card.querySelector('input[data-produce-key]');
    if (checkbox && !checkbox.checked) {
      checkbox.checked = true;
      toggleProduceCheck(checkbox);
    }
  }
  updateProductionProgressCard(card, item, total, chunk);
}
function resetProductionProgress(button) {
  var item = decodeURIComponent(button.dataset.progressReset || '');
  var total = Math.max(0, parseInt(button.dataset.progressTotal, 10) || 0);
  if (!item) return;
  delete PRODUCTION_PROGRESS[item];
  saveProductionProgress();
  var card = button.closest('.recipe-card');
  if (card) {
    var checkbox = card.querySelector('input[data-produce-key]');
    if (checkbox && checkbox.checked) {
      checkbox.checked = false;
      toggleProduceCheck(checkbox);
    }
  }
  updateProductionProgressCard(card, item, total, PRODUCTION_PROGRESS_CHUNK);
}

// ── Plan identity ──────────────────────────────────────────────────────────
// The tick state is keyed by item/colony, not by plan, and nothing ever cleared
// it — so ticks leaked across runs: calculate something else that shares a
// material and it came up pre-ticked. Identify the plan being worked on, and
// wipe the ticks only when the TARGET changes (not on every re-render, since a
// path switch or source pin re-runs the same plan and must keep its progress).
var PLAN_SIG_KEY = 'cmg_plan_sig_v1';
var LAST_PLAN_SIG = '';
try { LAST_PLAN_SIG = localStorage.getItem(PLAN_SIG_KEY) || ''; } catch (e) {}

// One-shot "sample run" marker, consumed by the very next successful render.
// The guided sample plan goes through the exact same runCalculator() path as a
// real calculation (same semantics), but must not pollute the player's recent
// history. This is transient, never persisted.
var SAMPLE_RUN = false;

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
  clearProductionProgress();
  clearMiningProgress();
}

// An explicit Calculate/Build action starts a fresh player checklist, even when
// the item, quantity, and colony happen to be identical to the prior run.
// Internal re-renders pass preserveChecklist so mining progress and manual ticks
// survive their own inventory/cost refresh.
function resetChecklistForCalculation() {
  clearPlanChecks();
  reopenAutoCollapsed();
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
    if (card) {
      card.classList.remove('done');
      card.classList.remove('progress-complete');
    }
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
  runCalculator({ preserveChecklist: true });
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

function colonyOwnerLabel(ids) {
  if (!ids.length) return '<span class="owner-chip owner-chip-empty">Owner not set</span>';
  const names = ids.map(id => window.factionById?.(id)?.name || id);
  const joint = ids.length > 1;
  return ids.map((id, i) => `<span class="owner-chip owner-chip-${esc(id.toLowerCase())}">${esc(names[i])}</span>`).join('') +
    (joint ? '<span class="owner-joint-label">Global Dominion · joint holding</span>' : '');
}

function renderColonyOverview(productionRows) {
  const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  const owned = productionRows.filter(r => r.colony && isOwnColony(r.colony)).length;
  const joint = productionRows.filter(r => r.colony && colonyOwnerIds(r.colony).length > 1).length;
  const taxed = productionRows.filter(r => r.colony && (COLONY_TAX[r.colony] || 0) > 0).length;
  set('col-metric-production', productionRows.length);
  set('col-metric-owned', owned);
  set('col-metric-joint', joint);
  set('col-metric-taxed', taxed);
}

function renderColonyCard(r, mines, q) {
  const owners = colonyOwnerIds(r.colony);
  const own = isOwnColony(r.colony);
  const rate = typeof COLONY_TAX[r.colony] === 'number' ? COLONY_TAX[r.colony] : 0;
  const enc = encodeURIComponent(r.colony);
  const yields = mines[r.colony] || [];
  const ownerOptions = (window.ER_FACTIONS?.selectable || []).map(f =>
    `<label class="owner-check"><input type="checkbox" value="${esc(f.id)}" data-colony-owner="${enc}"${owners.includes(f.id) ? ' checked' : ''} /> <span>${esc(f.name)}</span></label>`
  ).join('');
  const resources = yields.length ? yields.map(m => {
    const have = (window.INV_TOTAL && INV_TOTAL[m]) || 0;
    const hit = q && m.toLowerCase().includes(q);
    return `<span class="resource-chip${hit ? ' resource-chip-hit' : ''}">${iconFor(m)}<span>${esc(displayName(m))}</span>${have ? `<b>${fmt(have)}</b>` : ''}</span>`;
  }).join('') : '<span class="muted">No mine data</span>';
  return `<article class="colonies-card${own ? ' colonies-card-owned' : ''}" data-colony-card="${enc}">
    <div class="colonies-card-head"><div><span class="eyebrow">Production world</span><h5>${esc(r.name)}</h5></div><button class="icon-action faction-audio" type="button" aria-label="Play welcome audio for ${esc(r.name)}" onclick="playAudio('voice_extracted/${r.world}.ogg',0.5)">🔊</button></div>
    <div class="colonies-card-status"><div class="owner-list" aria-label="Owners of ${esc(r.name)}">${colonyOwnerLabel(owners)}</div><span class="colony-tax-value">Tax <b>${rate}%</b></span></div>
    <div class="colonies-resources"><span class="colonies-label">Mines here</span><div class="resource-list">${resources}</div></div>
    <details class="colony-editor"><summary data-colony-edit="${enc}">Edit world state</summary><div class="colony-editor-body"><fieldset><legend>Owners</legend><label class="owner-check owner-check-clear"><input type="checkbox" data-colony-clear="${enc}"${owners.length ? '' : ' checked'} /> Owner not set</label>${ownerOptions}</fieldset><label class="tax-editor">Colony tax <span><input type="number" min="0" max="500" step="5" value="${rate}" data-ct-tax="${enc}" aria-label="Tax percent at ${esc(r.name)}" /> %</span></label><p class="muted editor-hint">Ownership controls faction return calculations; tax changes production cost.</p></div></details>
  </article>`;
}

function renderReferenceCard(r) {
  return `<div class="reference-world-card"><span class="reference-world-name">${esc(r.name)}</span><span class="reference-world-label">Reference world</span>${r.world ? `<button class="icon-action faction-audio" type="button" aria-label="Play welcome audio for ${esc(r.name)}" onclick="playAudio('voice_extracted/${r.world}.ogg',0.5)">🔊</button>` : ''}</div>`;
}

function renderColonies() {
  const grid = document.getElementById('col-grid');
  if (!grid) { updateColonyTaxNote(); return; }
  const mines = {};
  ((window.GAME_DATA && GAME_DATA.mining_sites) || []).forEach(s => { mines[s.location] = (mines[s.location] || []).concat(s.yields || []); });
  const q = ((document.getElementById('col-search') || {}).value || '').trim().toLowerCase();
  const mode = (document.getElementById('col-filter') || {}).value || 'all';
  const pricedOnly = !!(document.getElementById('col-priced-only') || {}).checked;
  const allRows = colonyRows();
  const productionRows = allRows.filter(r => r.priced);
  const matches = r => !q || r.name.toLowerCase().includes(q) || ((r.colony && mines[r.colony]) || []).some(m => m.toLowerCase().includes(q)) || colonyOwnerIds(r.colony || '').some(id => id.toLowerCase().includes(q));
  const filteredProduction = productionRows.filter(r => matches(r) && (!pricedOnly || r.priced) && (mode === 'all' || mode === 'mine' && isOwnColony(r.colony) || mode === 'joint' && colonyOwnerIds(r.colony).length > 1));
  const referenceRows = allRows.filter(r => !r.priced && matches(r) && mode === 'reference');
  renderColonyOverview(productionRows);
  grid.innerHTML = filteredProduction.map(r => renderColonyCard(r, mines, q)).join('') || '<div class="colonies-empty">No production colonies match. Try another search or filter.</div>';
  const refGrid = document.getElementById('col-reference-grid');
  const refSection = document.getElementById('colonies-reference');
  if (refGrid) refGrid.innerHTML = referenceRows.map(renderReferenceCard).join('') || '<div class="colonies-empty">Choose “Other known worlds” to browse reference worlds.</div>';
  if (refSection) refSection.hidden = mode !== 'reference';
  const count = document.getElementById('col-count');
  if (count) count.textContent = `${filteredProduction.length} shown · ${productionRows.length} production worlds`;
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
  if (CALC_TRAY.length) runMultiPlan({ preserveChecklist: true });
  else if (document.querySelector('#calc-result .plan-summary')) runCalculator({ preserveChecklist: true });
}

// One handler for both controls — recalculating so the cost card moves with it.
function onColonyTaxChange(el) {
  const taxFor = el.dataset.ctTax;
  const ownerFor = el.dataset.colonyOwner || el.dataset.colonyClear;
  if (taxFor) {
    const v = Math.max(0, Math.min(500, parseInt(el.value, 10) || 0));
    COLONY_TAX[decodeURIComponent(taxFor)] = v;
    el.value = v;
  } else if (ownerFor) {
    const c = decodeURIComponent(ownerFor);
    const card = el.closest('[data-colony-card]');
    const owner = Array.from(card?.querySelectorAll(`[data-colony-owner="${ownerFor}"]:checked`) || []).map(input => input.value).filter(Boolean);
    const clear = card?.querySelector(`[data-colony-clear="${ownerFor}"]`);
    if (clear?.checked) {
      card.querySelectorAll(`[data-colony-owner="${ownerFor}"]`).forEach(input => { input.checked = false; });
      delete COLONY_OWNER[c];
    } else if (owner.length) {
      if (clear) clear.checked = false;
      COLONY_OWNER[c] = owner;
    } else delete COLONY_OWNER[c];
    refreshEngineFactionContext();
  }
  saveColonySettings();
  renderColonyTax();
  updateColonyTaxNote();
  const colony = decodeURIComponent(taxFor || ownerFor);
  if (typeof syncShared === 'function') syncShared('taxes', [colonyOp(colony)]);
  rerunActivePlan();
}

// Re-cost whatever is on screen. Used after a rate changes locally and after a
// change arrives from another member.
function rerunActivePlan(options) {
  options = options || {};
  if (CALC_TRAY.length) runMultiPlan({ preserveChecklist: true, preserveViewport: !!options.preserveViewport });
  else if (document.querySelector('#calc-result .plan-summary')) runCalculator({ preserveChecklist: true, preserveViewport: !!options.preserveViewport });
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
      : (info.preferred || (from.length ? from[0] : NO_SITE));
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

      var mineDone = Math.max(0, Number(MINING_PROGRESS[t.item]) || 0);
      // Mining is a checklist only, so the plan's acquire quantity never changes.
      var mineTotal = Math.max(0, Number(info.qty) || 0);
      var mineRemaining = Math.max(0, mineTotal - mineDone);
      var mineBatchQty = Math.min(MINE_BATCH, mineRemaining);
      var batchButtonHtml = from.length && mineRemaining > 0
        ? '<button type="button" class="mine-log obtain-batch progress-run" data-mine="' + encodeURIComponent(t.item) +
            '" data-qty="' + mineBatchQty + '" data-mine-total="' + mineTotal +
            '" title="Record one mining batch for this material">Record ' +
              (mineBatchQty === mineRemaining ? 'final ' : 'next ') + fmt(mineBatchQty) +
              ' batch' + (mineBatchQty === 1 ? '' : 'es') + '</button>'
        : '';
      var batchHtml = from.length && mineTotal > 0
        ? renderMiningProgress(t.item, mineTotal, mineDone, mineRemaining) + batchButtonHtml
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
          batchHtml +
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

function markObtainCompleteForMining(item) {
  var checkboxes = document.querySelectorAll('.obtain-cb');
  for (var i = 0; i < checkboxes.length; i++) {
    var cb = checkboxes[i];
    if (cb.dataset.obtainKey === item && !cb.checked) {
      cb.checked = true;
      toggleObtainCheck(cb);
      break;
    }
  }
}

function resetMiningProgress(button) {
  var item = decodeURIComponent(button.dataset.miningReset || '');
  if (!item) return;
  delete MINING_PROGRESS[item];
  saveMiningProgress();
  var checkboxes = document.querySelectorAll('.obtain-cb');
  for (var i = 0; i < checkboxes.length; i++) {
    var cb = checkboxes[i];
    if (cb.dataset.obtainKey === item && cb.checked) {
      cb.checked = false;
      toggleObtainCheck(cb);
      break;
    }
  }
  rerunActivePlan({ preserveViewport: true });
}

function renderMiningProgress(item, total, done, remaining) {
  if (!total) return '';
  var enc = encodeURIComponent(item);
  var complete = remaining === 0;
  return '<div class="mine-progress' + (complete ? ' complete' : '') + '" data-mine-progress="' + enc + '">' +
    '<div class="mine-progress-head"><span data-mine-progress-count>' + fmt(done) + ' / ' + fmt(total) + ' mined</span>' +
      '<span class="mine-progress-remaining" data-mine-progress-remaining>' + fmt(remaining) + ' remaining</span></div>' +
    '<div class="mine-progress-track" role="progressbar" aria-label="Mining progress for ' + esc(displayName(item)) + '" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + done + '">' +
      '<span class="mine-progress-fill" style="width:' + Math.round(done / total * 100) + '%"></span></div>' +
    (complete ? '<button type="button" class="mine-progress-reset" data-mining-reset="' + enc + '">Reset mining log</button>' : '') +
  '</div>';
}

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
    // The plan need remains the original target because mining records do not consume inventory.
    var total = need > 0 ? need : 0;
    var done = total ? miningProgressFor(item, total) : 0;
    var remaining = Math.max(0, total - done);
    var complete = total > 0 && remaining === 0;
    var have = atDest[item] || 0;
    var enc = encodeURIComponent(item);
    var totalAttr = total ? ' data-mine-total="' + total + '"' : '';
    var needLabel = complete
      ? '<span class="mine-need complete">all ' + fmt(total) + ' mined</span>'
      : (total ? '<span class="mine-need">plan needs ' + fmt(remaining) + '</span>'
               : '<span class="mine-need muted">for later</span>');
    var fullQty = total ? Math.min(MINE_BATCH, remaining) : MINE_BATCH;
    var midQty = total ? Math.min(50, remaining) : 50;
    var smallQty = total ? Math.min(25, remaining) : 25;
    var actions = complete || !total ? '' :
      '<span class="mine-acts">' +
        '<button type="button" class="mine-log full" data-mine="' + enc + '" data-qty="' + fullQty + '"' + totalAttr +
          ' title="Log a full batch — best rate per unit">+' + fullQty + '</button>' +
        '<button type="button" class="mine-log" data-mine="' + enc + '" data-qty="' + midQty + '"' + totalAttr + '>+' + midQty + '</button>' +
        '<button type="button" class="mine-log" data-mine="' + enc + '" data-qty="' + smallQty + '"' + totalAttr + '>+' + smallQty + '</button>' +
        '<input type="number" class="mine-qty" min="1" max="' + MINE_BATCH + '" placeholder="1-' + MINE_BATCH + '"' +
          ' data-mine-qty="' + enc + '"' + totalAttr + ' aria-label="Custom amount mined of ' + esc(item) + '" />' +
      '</span>';
    return '<div class="mine-row' + (total ? ' wanted' : '') + (complete ? ' mining-complete' : '') + '">' +
      '<span class="mine-row-item">' + iconFor(item) +
        '<span class="mine-row-name">' + esc(displayName(item)) + '</span></span>' +
      needLabel +
      '<span class="mine-have">' + (have > 0 ? fmt(have) + ' here' : '') + '</span>' +
      renderMiningProgress(item, total, done, remaining) +
      actions +
    '</div>';
  }).join('');

  return '<div class="mine-slots">' +
    '<div class="mine-slots-head">⛏ Mining slots at ' + esc(DESTINATION) +
      '<span class="mine-slots-hint">2 slots free while production runs · a full ' + MINE_BATCH +
      ' costs about 25% less per unit than smaller pulls</span></div>' +
    rows +
    '<div class="mine-slots-foot muted">Player-facing mining log only — inventory and plan totals stay unchanged.</div>' +
  '</div>';
}

// Record mining progress for the current plan without changing inventory or plan totals.
function logMined(item, qty, total) {
  var requested = Math.max(1, Math.min(MINE_BATCH, parseInt(qty, 10) || 0));
  var target = Math.max(0, parseInt(total, 10) || 0);
  var state = null;
  if (target) {
    state = nextProductionProgress(miningProgressFor(item, target), target, requested);
    requested = state.advanced;
    if (!requested) return;
  }
  if (!item || !ALL_ITEMS.has(item)) return;
  if (state) {
    MINING_PROGRESS[item] = state.completed;
    saveMiningProgress();
    if (state.remaining === 0) markObtainCompleteForMining(item);
  }
  toast('Recorded ' + fmt(requested) + ' mined ' + displayName(item) +
    (state ? ' (' + fmt(state.remaining) + ' remaining).' : '.'),
    2500, 'success');
  if (CALC_TRAY.length) runMultiPlan({ preserveChecklist: true, preserveViewport: true });
  else if (LAST_SINGLE && LAST_SINGLE.item) {
    document.getElementById('calc-item').value = LAST_SINGLE.item;
    document.getElementById('calc-qty').value = LAST_SINGLE.qty;
    runCalculator({ preserveChecklist: true, preserveViewport: true });
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
  // The SAME starting stock the plan below is computed from. compute() mutates
  // the ledger it is handed (owned stock is deducted as the plan is built), so
  // the what-if comparison gets its own untouched copy — otherwise its "here"
  // row would re-plan from post-consumption stock and disagree with the plan
  // on screen.
  const planLedger = Object.assign({}, INV_TOTAL);
  let result, plan;
  try {
    result = compute(item, qty, altChoices, Object.assign({}, planLedger), INV_LOCATIONS, DESTINATION, discounts);
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
      ${decisionSummary(plan)}
      ${drugPlanHtml}
      ${showTheMathPanel(plan)}
      ${statsHtml}
      ${renderColonyCompare({
        items: [{ item, qty }], chosen: altChoices, ledger: planLedger,
        invLoc: INV_LOCATIONS, discounts, dest: DESTINATION,
      })}
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
  const options = arguments[0] || {};
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
  if (!options.preserveChecklist) resetChecklistForCalculation();
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
    if (SAMPLE_RUN) {
      // Sample plans are demonstrations — they don't belong in the player's
      // recent history. The marker is consumed here, so any later render of
      // the same target records recents normally.
      SAMPLE_RUN = false;
    } else {
      pushRecent(item, qty);
      // A real first calculation completes onboarding immediately. Do not move
      // focus here: runCalculator() moves it to the result below.
      if (typeof dismissCalcGuide === 'function') dismissCalcGuide({ focus: false });
    }
    if (!options.preserveViewport) {
      out.tabIndex = -1;
      out.scrollIntoView({ behavior: 'smooth', block: 'start' });
      out.focus({ preventScroll: true });
    }
  }
  markDoneSections(out);
  renderCalcPaths();
  updateShareLink();
  window.CMG_VALUE_TRANSITION?.markChanged(out);
  window.CMG_VALUE_TRANSITION?.announce({ item, quantity: qty, result: out });
}

// ---- Guided sample plan (P4) ----
// Safe by construction: it only fills the calculator inputs and runs the
// normal calculation path. Nothing is applied to inventory, no player or
// saved-plan state is created, and the run is kept out of the recent list.
function loadSamplePlan() {
  const sampleItem = 'Emergency MediKit';
  const sampleQty = 10;
  const itemInput = document.getElementById('calc-item');
  const qtyInput = document.getElementById('calc-qty');
  if (!itemInput || !ALL_ITEMS.has(sampleItem)) { toast('Sample plan unavailable — pick an item from the catalog instead.', 4000, 'error'); return; }
  itemInput.value = sampleItem;
  if (qtyInput) qtyInput.value = String(sampleQty);
  dismissCalcGuide(); // the sample demonstrates the full flow
  SAMPLE_RUN = true;
  runCalculator();
  toast('Sample plan loaded — nothing was applied to your inventory.', 4000, 'success');
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
function runMultiPlan(options) {
  options = options || {};
  if (CALC_TRAY.length === 0) { toast('Add at least one item to the plan.'); return; }
  if (!options.preserveChecklist) resetChecklistForCalculation();
  const out = document.getElementById('calc-multi');
  const single = document.getElementById('calc-result');
  single.innerHTML = ''; single.classList.remove('multi');
  // Same identity handling as the single plan — clean checklist on a new tray.
  const planSig = planSignature(CALC_TRAY);
  const planApplied = syncPlanIdentity(planSig);

  // Build a shared ledger from current inventory
  const ledger = Object.assign({}, INV_TOTAL);
  // Untouched copy for the what-if comparison — compute() mutates `ledger` as
  // it deducts owned stock, so the comparison must start from the same full
  // inventory the plan on screen started from.
  const specLedger = Object.assign({}, INV_TOTAL);
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
  html += showTheMathPanel(plan);
  html += decisionSummary(plan);
  html += renderColonyCompare({
    items: CALC_TRAY, chosen: ALTERNATIVE_CHOICES, ledger: specLedger, invLoc,
    discounts, dest: DESTINATION,
  });
  // The shared picker renderer needs a mount point in combined plans too.
  // Without it, renderCalcPaths() exits after the single-plan result is cleared.
  html += '<div id="calc-paths" class="calc-paths" hidden></div>';
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
  if (!options.preserveViewport) out.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
