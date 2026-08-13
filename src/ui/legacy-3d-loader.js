/* Legacy three.js compatibility loader. It keeps the old viewer available without
 * creating a WebGL context or downloading its scripts on initial page load. */
'use strict';

(function installCMGLegacyLoader(window, document) {
  let promise = null;
  const scripts = [
    'src/vendor/three/three.min.js?v=1',
    'src/vendor/three/OrbitControls.js?v=1',
    'src/vendor/three/GLTFLoader.js?v=1',
  ];
  window.cmgLoadLegacy3D = function cmgLoadLegacy3D() {
    if (window.THREE?.GLTFLoader && window.THREE?.OrbitControls) return Promise.resolve(window.THREE);
    if (promise) return promise;
    promise = scripts.reduce(function (chain, src) {
      return chain.then(function () {
        return new Promise(function (resolve, reject) {
          const script = document.createElement('script');
          script.src = src;
          script.onload = resolve;
          script.onerror = function () { reject(new Error('Could not load ' + src)); };
          document.head.appendChild(script);
        });
      });
    }, Promise.resolve()).then(function () { return window.THREE; });
    return promise;
  };
})(window, document);
