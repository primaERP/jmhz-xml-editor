// Stable loader for JMHZ Viewer — never changes, safe to cache forever.
// Fetches manifest.json to discover the current hashed bundle, then loads it.
(function () {
  var base = (document.currentScript && document.currentScript.src || '').replace(/[^\/]*$/, '');
  var q = window.__JMHZ_PENDING__ = [];
  window.__JMHZ_BASE_URL__ = base;

  function fail(err) {
    console.error('JMHZ Viewer: ' + err.message);
    q.forEach(function (c) { c.reject(err); });
    q.length = 0;
  }

  window.JMHZViewer = {
    mount: function (target, options) {
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
      var s = document.createElement('script');
      s.src = base + m.file;
      s.onerror = function () { fail(new Error('Failed to load ' + s.src)); };
      document.head.appendChild(s);
    })
    .catch(function (err) { fail(err); });
})();
