/**
 * src/analytics.js — Privacy-respecting usage analytics
 * ============================================================================
 * Tracks page views and feature usage for the in-app analytics dashboard.
 * Zero cookies, zero fingerprinting. All tracking is opt-in.
 *
 * Events are batched in memory and persisted locally every 60s (or when 50 events
 * accumulate). Nothing is sent to a remote analytics service.
 *
 * Opt-out: set localStorage.cmg_analytics_optout = '1' to disable.
 *           The Analytics tab provides a UI toggle.
 *
 * Exports: window.ANALYTICS
 *   ANALYTICS.track(type, data)  — queue an event
 *   ANALYTICS.enable()           — opt in
 *   ANALYTICS.disable()          — opt out
 *   ANALYTICS.isEnabled()        — check state
 *   ANALYTICS.flush()            — force-send buffered events
 *
 * Load order: after game_data.js, before app.js
 */
'use strict';
(function() {

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analytics is local-only in the public build. Events never leave the browser.
 * This keeps the dashboard useful without requiring Cloudflare, a server, or
 * third-party tracking.
 */
const LOCAL_KEY = 'er_calculator_analytics_v1';

/** How often to persist buffered events (ms). */
const FLUSH_INTERVAL = 60_000;

/** Max events to buffer before flushing early. */
const MAX_BUFFER = 50;

/** localStorage key for opt-out flag. */
const OPTOUT_KEY = 'cmg_analytics_optout';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let buffer = [];
let flushTimer = null;
let disabled = _loadOptOut();

function _loadOptOut() {
  try {
    return localStorage.getItem(OPTOUT_KEY) === '1';
  } catch (e) {
    return false; // localStorage unavailable → assume enabled
  }
}

function _saveOptOut(val) {
  try {
    if (val) localStorage.setItem(OPTOUT_KEY, '1');
    else localStorage.removeItem(OPTOUT_KEY);
  } catch (e) { /* silent */ }
}

// ═══════════════════════════════════════════════════════════════════════════
// FLUSH — send buffered events to the worker
// ═══════════════════════════════════════════════════════════════════════════

function flush() {
  if (disabled || buffer.length === 0) return;

  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    const merged = existing.concat(buffer).slice(-500);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(merged));
  } catch (e) { /* storage unavailable or full — never block the app */ }
  buffer = [];
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, FLUSH_INTERVAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Queue an analytics event. Silently dropped if analytics is disabled.
 *
 * @param {string} type  — event type: 'pageview', 'calculate', 'apply_plan',
 *                         'inventory_edit', 'request_create', 'gear_save',
 *                         'player_switch'
 * @param {object} [data] — event-specific payload:
 *   pageview:       {tab}
 *   calculate:      {item, qty}
 *   apply_plan:     {item}
 *   inventory_edit: {mode}  — 'add', 'subtract', 'set', 'delete'
 *   request_create: (none)
 *   gear_save:      (none)
 *   player_switch:  (none)
 */
function track(type, data) {
  if (disabled) return;

  const evt = {
    type,
    ts: Date.now(),
  };

  // Copy known data fields (explicit allowlist — never capture unknown fields)
  if (data) {
    if (data.tab) evt.tab = String(data.tab).slice(0, 50);
    if (data.item) evt.item = String(data.item).slice(0, 100);
    if (data.qty != null) evt.qty = Math.max(1, Math.min(1_000_000, Math.floor(Number(data.qty)) || 1));
    if (data.mode) evt.mode = String(data.mode).slice(0, 20);
  }

  buffer.push(evt);

  // Flush early if buffer is full
  if (buffer.length >= MAX_BUFFER) {
    flush();
  } else {
    scheduleFlush();
  }
}

function enable() {
  if (!disabled) return;
  disabled = false;
  _saveOptOut(false);
}

function disable() {
  if (disabled) return;
  disabled = true;
  _saveOptOut(true);
  // Drop any buffered events
  buffer = [];
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

function isEnabled() {
  return !disabled;
}

// Flush on page unload to avoid losing the last batch
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flush);
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════

window.ANALYTICS = { track, enable, disable, isEnabled, flush };

})();
