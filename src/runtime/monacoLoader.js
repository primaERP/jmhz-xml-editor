let monacoPromise = null;

function withTrailingSlash(path) {
  if (!path) return '';
  return path.endsWith('/') ? path : path + '/';
}

function resolveAssetPath(assetBase, relativePath) {
  return withTrailingSlash(assetBase) + relativePath.replace(/^\/+/, '');
}

function loadScriptOnce(url) {
  return new Promise((resolve, reject) => {
    const existing = Array.from(document.querySelectorAll('script')).find((script) => {
      return script.src === url || script.getAttribute('src') === url;
    });
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load: ' + url)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => reject(new Error('Failed to load: ' + url)), { once: true });
    document.head.appendChild(script);
  });
}

function loadStylesheetOnce(url) {
  const existing = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find((link) => {
    return link.href === url || link.getAttribute('href') === url;
  });
  if (existing) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}

export function loadMonaco(assetBase = '') {
  if (window.monaco?.editor) {
    return Promise.resolve(window.monaco);
  }

  if (monacoPromise) {
    return monacoPromise;
  }

  const vsBase = resolveAssetPath(assetBase, 'vendor/monaco/vs');
  loadStylesheetOnce(resolveAssetPath(assetBase, 'vendor/monaco/vs/editor/editor.main.css'));

  monacoPromise = loadScriptOnce(resolveAssetPath(assetBase, 'vendor/monaco/vs/loader.js')).then(() => {
    const amdRequire = window.require;
    if (!amdRequire?.config) {
      throw new Error('Monaco AMD loader is not available');
    }

    return new Promise((resolve, reject) => {
      amdRequire.config({ paths: { vs: vsBase } });
      amdRequire(['vs/editor/editor.main'], () => resolve(window.monaco), reject);
    });
  }).catch((error) => {
    monacoPromise = null;
    throw error;
  });

  return monacoPromise;
}
