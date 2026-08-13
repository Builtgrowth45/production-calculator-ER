/* Accessible motion helpers for the staged vanilla shell. */
'use strict';

(function installCMGMotion(window, document) {
  function prefersReducedMotion() {
    return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  }

  function cleanup(from, to, root) {
    from?.classList.remove('cmg-view-leaving');
    to?.classList.remove('cmg-view-entering');
    root.classList.remove('cmg-view-transitioning');
  }

  function runCMGViewTransition(update, panels = {}) {
    const root = document.documentElement;
    const from = panels.from;
    const to = panels.to;
    if (typeof update !== 'function') return undefined;
    if (prefersReducedMotion() || from === to) {
      update();
      cleanup(from, to, root);
      return undefined;
    }

    if (typeof document.startViewTransition === 'function') {
      root.classList.add('cmg-view-transitioning');
      const transition = document.startViewTransition(() => update());
      transition.finished.finally(() => cleanup(from, to, root));
      return transition;
    }

    // The outgoing panel stays displayable for the first frame, so the fallback
    // still communicates direction in browsers without View Transitions.
    root.classList.add('cmg-view-transitioning');
    from?.classList.add('cmg-view-leaving');
    update();
    to?.classList.add('cmg-view-entering');
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => cleanup(from, to, root));
    });
    return undefined;
  }

  window.runCMGViewTransition = runCMGViewTransition;
})(window, document);
