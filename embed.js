// Stable loader for JMHZ Viewer — never changes, safe to cache forever.
// Fetches manifest.json to discover the current hashed bundle, then loads it.
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

  fetch(base + 'manifest.json?t=' + Date.now())
    .then(function (r) {
      if (!r.ok) throw new Error('manifest.json HTTP ' + r.status);
      return r.json();
    })
    .then(function (m) {
      window.__JMHZ_MANIFEST__ = m;
      var s = document.createElement('script');
      s.src = base + m.bundle;
      s.onerror = function () { fail(new Error('Failed to load ' + s.src)); };
      document.head.appendChild(s);
    })
    .catch(function (err) { fail(err); });
})();
