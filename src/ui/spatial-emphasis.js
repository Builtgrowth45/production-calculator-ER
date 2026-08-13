/* Accessible non-spatial fallback for production-flow emphasis. */
'use strict';

(function installCMGSpatialEmphasis(window) {
  window.setCMGSpatialEmphasis = function setCMGSpatialEmphasis(target, enabled, label) {
    if (!target) return false;
    target.classList.toggle('cmg-spatial-emphasis', Boolean(enabled));
    target.toggleAttribute('data-spatial-emphasis', Boolean(enabled));
    if (label) target.setAttribute('aria-label', label);
    return true;
  };
})(window);
