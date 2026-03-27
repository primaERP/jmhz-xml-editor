// Embed loader for JMHZ Viewer
// Loaded via a single <script> tag; dynamically loads all dependencies from sibling files.
// Queues mount() calls until the runtime is ready, so callers can call mount() immediately.
(function () {
  var currentScript = document.currentScript;
  var baseUrl = currentScript && currentScript.src
    ? currentScript.src.replace(/[^\/]*$/, '')
    : '';

  var pendingCalls = [];
  var ready = false;

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

  // Expose queuing mount API immediately
  window.JMHZViewer = {
    mount: function (target, options) {
      if (ready) return realMount(target, options);
      pendingCalls.push({ target: target, options: options });
    }
  };

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
    if (document.querySelector('link[href="' + url + '"]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
  }

  async function init() {
    loadCSS(baseUrl + 'viewer.css');

    // Vendor libraries
    await loadScript(baseUrl + 'vendor/vue.global.prod.js');
    await loadScript(baseUrl + 'vendor/xmllint-wasm-bundle.js');

    // Schema / data
    await loadScript(baseUrl + 'data/xsd-data.js');
    await loadScript(baseUrl + 'data/jmhz-xsd-data.js');

    // Format definitions
    await loadScript(baseUrl + 'formats.js');

    // Viewer runtime (template + helpers + viewer)
    await loadScript(baseUrl + 'viewer.runtime.js');

    // Ready — swap mount and replay queue
    ready = true;
    window.JMHZViewer.mount = realMount;
    pendingCalls.forEach(function (c) { realMount(c.target, c.options); });
    pendingCalls = [];
  }

  init().catch(function (err) {
    console.error('JMHZ Viewer: failed to load dependencies', err);
  });
})();
