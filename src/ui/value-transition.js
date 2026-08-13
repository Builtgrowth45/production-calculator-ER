/* Targeted calculator feedback. This observes rendered values, not React state. */
'use strict';

(function installCMGValueTransition(window) {
  const previous = new Map();
  const timers = new WeakMap();
  const SELECTORS = ['.cost-panel-total', '.kpi-value', '.mat-row', '.step-card'];

  function markChanged(container) {
    if (!container) return;
    SELECTORS.forEach(selector => {
      [...container.querySelectorAll(selector)].forEach((node, index) => {
        const key = `${container.id || 'calc'}:${selector}:${index}`;
        const value = node.textContent.trim();
        const old = previous.get(key);
        previous.set(key, value);
        if (old === undefined || old === value) return;
        node.classList.remove('cmg-value-changed');
        void node.offsetWidth;
        node.classList.add('cmg-value-changed');
        clearTimeout(timers.get(node));
        timers.set(node, window.setTimeout(() => node.classList.remove('cmg-value-changed'), 420));
      });
    });
  }

  function announce({ item, quantity, result }) {
    const live = document.getElementById('calc-live-summary');
    if (!live) return;
    const total = result?.querySelector('.cost-panel-total')?.textContent.trim();
    const status = total ? `Total ${total}.` : 'Cost details are still being calculated.';
    live.textContent = `${item || 'Production plan'}, quantity ${quantity || 1}. ${status}`;
  }

  window.CMG_VALUE_TRANSITION = Object.freeze({ markChanged, announce });
})(window);
