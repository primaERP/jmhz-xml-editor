// Stable loader for JMHZ Viewer — never changes, safe to cache forever.
// Loads manifest.js (via <script> tag, CORS-safe) to discover the current
// hashed bundle, then loads it.
(function () {
  if (window.JMHZViewer) return; // already loaded — prevent double-include clobbering

  var base = (document.currentScript && document.currentScript.src || '').replace(/[^\/]*$/, '');
  var q = window.__JMHZ_PENDING__ = [];
  var state = window.__JMHZ_STATE__ = 'loading';
  var lastError = null;
  window.__JMHZ_BASE_URL__ = base;

  function fail(err) {
    lastError = err;
    state = window.__JMHZ_STATE__ = 'failed';
    console.error('JMHZ Viewer: ' + err.message);
    q.forEach(function (c) { c.reject(err); });
    q.length = 0;
    window.JMHZViewer.mount = function () {
      return Promise.reject(lastError);
    };
  }

  window.JMHZViewer = {
    mount: function (target, options) {
      if (state === 'failed') return Promise.reject(lastError);
      return new Promise(function (resolve, reject) {
        q.push({ target: target, options: options, resolve: resolve, reject: reject });
      });
    }
  };

  // Load manifest via <script> tag — unlike fetch(), this is not subject
  // to CORS and works cross-origin and from file:// URLs.
  var ms = document.createElement('script');
  ms.src = base + 'manifest.js?t=' + Date.now();
  ms.onload = function () {
    var m = window.__JMHZ_MANIFEST__;
    if (!m) { fail(new Error('manifest.js loaded but __JMHZ_MANIFEST__ not set')); return; }
    var s = document.createElement('script');
    s.src = base + m.bundle;
    s.onerror = function () { fail(new Error('Failed to load ' + s.src)); };
    document.head.appendChild(s);
  };
  ms.onerror = function () { fail(new Error('Failed to load ' + ms.src)); };
  document.head.appendChild(ms);
})();
