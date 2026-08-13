/* Lazy loader for the opt-in React/R3F island. */
'use strict';

(function installCMGR3FLoader(window, document) {
  let promise = null;
  window.cmgLoadR3F = function cmgLoadR3F() {
    if (window.CMG3D) return Promise.resolve(window.CMG3D);
    if (promise) return promise;
    promise = new Promise(function (resolve, reject) {
      const script = document.createElement('script');
      script.src = 'src/generated/er-3d-workbench.js?v=1';
      script.async = true;
      script.onload = function () {
        if (window.CMG3D) resolve(window.CMG3D);
        else reject(new Error('R3F bundle loaded without CMG3D bridge'));
      };
      script.onerror = function () { reject(new Error('Could not load the optional R3F bundle')); };
      document.head.appendChild(script);
    });
    return promise;
  };

  window.mountCMGPreview = function mountCMGPreview(target, entry) {
    if (!window.CMG_FEATURE_FLAGS?.r3f_v1) return Promise.resolve(false);
    return window.cmgLoadR3F().then(function (api) {
      api.mount(target, { mode: 'preview', entry: entry });
      return true;
    });
  };
})(window, document);
