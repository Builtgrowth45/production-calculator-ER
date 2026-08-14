/* Chart.js lazy loader. Keeps Chart.js (~200 KB raw / ~60 KB gzip) out of the
 * initial payload: the only consumer is the Inventory "📊 Inventory Charts"
 * panel, which sits behind a collapsed <details> gate. This stub is precached
 * in the install shell; the heavy vendor script is fetched on first expand and
 * runtime-cached by the service worker's network-first fetch handler. */
'use strict';

(function installCMGChartLoader(window, document) {
  let promise = null;
  window.cmgLoadChart = function cmgLoadChart() {
    if (window.Chart) return Promise.resolve(window.Chart);
    if (promise) return promise;
    promise = new Promise(function (resolve, reject) {
      const script = document.createElement('script');
      script.src = 'src/vendor/chart.min.js?v=1';
      script.async = true;
      script.onload = function () { resolve(window.Chart); };
      script.onerror = function () {
        // Drop the rejected promise so a later open (e.g. after connectivity
        // returns) can genuinely retry instead of replaying the failure.
        promise = null;
        reject(new Error('Could not load Chart.js'));
      };
      document.head.appendChild(script);
    });
    return promise;
  };
})(window, document);
