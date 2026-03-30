// JMHZ Viewer bundle — loaded by loader.js via manifest.json.
// Dynamically loads all dependencies from sibling files, then replays
// any mount() calls that were queued by the loader while we were loading.
(function () {
  var baseUrl = window.__JMHZ_BASE_URL__ || '';
  var pending = window.__JMHZ_PENDING__ || [];

  function realMount(target, options) {
    options = options || {};
    var targetEl = typeof target === 'string' ? document.querySelector(target) : target;
    if (!targetEl) throw new Error('JMHZ Viewer mount target not found');
    targetEl.classList.add('app', 'jmhz-viewer-host');
    targetEl.innerHTML = window.JMHZ_VIEWER_TEMPLATE;
    return window.JMHZViewerRuntime.mount(targetEl, Object.assign({
      manageDocumentTitle: false,
      warnBeforeUnload: false,
      assetBase: baseUrl
    }, options));
  }

  function loadScript(url) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = url;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Failed to load: ' + url)); };
      document.head.appendChild(s);
    });
  }

  function loadCSS(url) {
    var exists = [].some.call(document.querySelectorAll('link[rel="stylesheet"]'), function (l) {
      return l.href === url || l.getAttribute('href') === url;
    });
    if (exists) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
  }

  async function init() {
    loadCSS(baseUrl + 'viewer.css');

    // Vendor libraries (independent — load in parallel)
    await Promise.all([
      loadScript(baseUrl + 'vendor/vue.global.prod.js'),
      loadScript(baseUrl + 'vendor/xmllint-wasm-bundle.js')
    ]);

    // Schema / data (independent — load in parallel)
    await Promise.all([
      loadScript(baseUrl + 'data/xsd-data.js'),
      loadScript(baseUrl + 'data/jmhz-xsd-data.js')
    ]);

    // Format definitions
    await loadScript(baseUrl + 'formats.js');

    // Viewer runtime (template + helpers + viewer)
    await loadScript(baseUrl + 'viewer.runtime.js');

    // Swap mount before replaying to avoid micro-window race
    window.__JMHZ_STATE__ = 'ready';
    window.JMHZViewer.mount = function (target, options) {
      return Promise.resolve().then(function () { return realMount(target, options); });
    };
    pending.forEach(function (c) {
      try { c.resolve(realMount(c.target, c.options)); }
      catch (err) { c.reject(err); }
    });
    pending.length = 0;
  }

  init().catch(function (err) {
    console.error('JMHZ Viewer: failed to load dependencies', err);
    window.__JMHZ_STATE__ = 'failed';
    window.JMHZViewer.mount = function () { return Promise.reject(err); };
    pending.forEach(function (c) { if (c.reject) c.reject(err); });
    pending.length = 0;
  });
})();
