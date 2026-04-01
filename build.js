const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function readBin(file) {
  return fs.readFileSync(file);
}

function dataUrl(file, mime) {
  return `data:${mime};base64,${readBin(file).toString('base64')}`;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hashedName(content, logicalPath) {
  const ext = path.extname(logicalPath);
  const base = logicalPath.slice(0, -ext.length);
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
  const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 8);
  return base + '_' + hash + ext;
}

// Remove stale hashed versions from dist/, keeping 1 most recent previous
function cleanStale(logicalPath, currentHashedBasename) {
  const ext = path.extname(logicalPath);
  const stem = path.basename(logicalPath, ext);
  const dir = path.join('dist', path.dirname(logicalPath));
  const pattern = new RegExp('^' + escapeRegex(stem) + '_[0-9a-f]{8}\\' + ext + '$');
  try {
    const stale = fs.readdirSync(dir)
      .filter(f => pattern.test(f) && f !== currentHashedBasename)
      .map(f => ({ name: f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    stale.slice(1).forEach(f => {
      fs.unlinkSync(path.join(dir, f.name));
      console.log('  Removed stale: ' + logicalPath.replace(path.basename(logicalPath), f.name));
    });
  } catch (e) { /* dir may not exist on first build */ }
}

// Write content-hashed file, clean stale versions, return hashed path
function writeHashed(content, logicalPath) {
  const hp = hashedName(content, logicalPath);
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
  ensureDir(path.join('dist', path.dirname(hp)));
  fs.writeFileSync(path.join('dist', hp.replace(/\//g, path.sep)), buf);
  cleanStale(logicalPath, path.basename(hp));
  return hp.replace(/\\/g, '/');
}

// ── Source files ──────────────────────────────────────────────
const css       = read('src/styles/viewer.css');
const helpers   = read('src/runtime/helpers.js');
const loader    = read('src/entrypoints/loader.js');
const embed     = read('src/entrypoints/embed.js');
const formats   = read('formats.js');
const kontroly  = read('jmhz-kontroly.js');
const inlineExampleFilename = 'regzec-sample-100.xml';
const inlineExampleXml = read(path.join('samples', inlineExampleFilename)).replace(/<\/script/gi, '<\\/script');
const uiAssets  = {
  logo: dataUrl(path.join('assets-src', 'abra-logo-2026.svg'), 'image/svg+xml'),
  previewTable: dataUrl(path.join('assets-src', 'preview-table.png'), 'image/png'),
  previewCards: dataUrl(path.join('assets-src', 'preview-cards.png'), 'image/png')
};

// ── Build viewer.runtime.js (helpers + Vite-compiled SolidJS bundle) ────
const viteOutput = read('build-intermediate/viewer.runtime.js');
const viewerRuntime = [
  'window.__JMHZ_UI_ASSETS__ = ' + JSON.stringify(uiAssets) + ';',
  helpers,
  viteOutput
].join('\n\n');

// standaloneHtml is generated after hashing — see below

// ── Build example-inline.html (integration template) ────────
const sampleHtml = `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JMHZ Viewer</title>
</head>
<body>
  <div id="jmhz-viewer-root"></div>
  <script id="jmhz-data" type="application/xml" data-filename="${inlineExampleFilename}">
${inlineExampleXml}
  <\/script>
  <script src="https://support.flexibee.eu/service/jmhz-viewer/embed.js"><\/script>
  <script>
    // mount(target, options) → Promise<handle>
    //   options:
    //     initialViewMode      'cards' | 'table'
    //     autoValidateOnLoad   true/false
    //     manageDocumentTitle  true/false
    //     warnBeforeUnload     true/false
    //     xml                  string (alternativa k <script id="jmhz-data">)
    //     filename             string (alternativa k data-filename)
    //     autoBootstrap        true/false (výchozí: true)
    //     bootstrapScriptId    string (výchozí: 'jmhz-data')
    //     onReady              function(handle)
    //
    //   handle.validate()              → Promise
    //   handle.loadXml(xml, filename)
    //   handle.destroy()
    //   handle.getState()              → { filename, isDirty, errorCount, employeeCount, hasData }

    window.JMHZViewer.mount('#jmhz-viewer-root', {
      initialViewMode: 'table',
      autoValidateOnLoad: true,
      manageDocumentTitle: true
    }).catch(function (err) {
      document.getElementById('jmhz-viewer-root').textContent =
        'Chyba při načítání JMHZ Vieweru: ' + err.message;
    });
  <\/script>
</body>
</html>`;

// ── Write hashed outputs ─────────────────────────────────────
ensureDir('dist');
ensureDir('dist/assets');
ensureDir('dist/vendor');
ensureDir('dist/data');
ensureDir('dist/images');

const manifest = { manifestVersion: 1, bundle: null, files: {} };

// App files → assets/
manifest.files['assets/viewer.runtime.js'] = writeHashed(viewerRuntime, 'assets/viewer.runtime.js');
manifest.files['assets/viewer.css']        = writeHashed(css, 'assets/viewer.css');
manifest.files['assets/formats.js']        = writeHashed(formats, 'assets/formats.js');
manifest.files['assets/jmhz-kontroly.js'] = writeHashed(kontroly, 'assets/jmhz-kontroly.js');

// Vendor libraries (read as Buffer for binary safety)
manifest.files['vendor/xmllint-wasm-bundle.js'] = writeHashed(readBin('xmllint-wasm-bundle.js'), 'vendor/xmllint-wasm-bundle.js');

// Schema / data
manifest.files['data/xsd-data.js']      = writeHashed(read('xsd-data.js'), 'data/xsd-data.js');
manifest.files['data/jmhz-xsd-data.js'] = writeHashed(read('jmhz-xsd-data.js'), 'data/jmhz-xsd-data.js');

// Embed bundle (stored as manifest.bundle, not in files map)
manifest.bundle = writeHashed(embed, 'assets/embed.js');

// Stable loader (not hashed — consumer entry point)
fs.writeFileSync('dist/embed.js', loader);

// Manifest (JSON for tooling, JS for CORS-safe runtime loading via <script> tag)
const manifestJson = JSON.stringify(manifest, null, 2) + '\n';
fs.writeFileSync('dist/manifest.json', manifestJson);
const manifestJs = 'window.__JMHZ_MANIFEST__ = ' + JSON.stringify(manifest) + ';\n';
fs.writeFileSync('dist/manifest.js', manifestJs);

// ── Build dist/index.html (standalone — hashed paths baked in) ─
const f = manifest.files;
const standaloneHtml = `<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>JMHZ Viewer</title>
<script src="${f['vendor/xmllint-wasm-bundle.js']}"><\/script>
<script src="${f['data/xsd-data.js']}"><\/script>
<script src="${f['data/jmhz-xsd-data.js']}"><\/script>
<script src="${f['assets/formats.js']}"><\/script>
<script src="${f['assets/jmhz-kontroly.js']}"><\/script>
<link rel="stylesheet" href="${f['assets/viewer.css']}">
</head>
<body>
<div id="app" class="app"></div>
<script id="jmhz-data" type="application/xml"></script>
<script src="${f['assets/viewer.runtime.js']}"><\/script>
<script>
var _target = document.getElementById('app');
if (_target) {
  window.JMHZViewerRuntime.mount(_target, { manageDocumentTitle: true, warnBeforeUnload: true });
}
<\/script>
</body>
</html>`;

// HTML pages
fs.writeFileSync('dist/index.html', standaloneHtml);
fs.writeFileSync('dist/example-inline.html', sampleHtml);

// Images (not hashed — loaded at runtime via Vue assetBase)
['abra-logo-2026.svg', 'preview-table.png', 'preview-cards.png'].forEach(file => {
  const srcPath = path.join('assets-src', file);
  if (fs.existsSync(srcPath)) copyFile(srcPath, 'dist/images/' + file);
});

// ── Summary ──────────────────────────────────────────────────
console.log('Built to dist/:');
console.log('  Manifest:');
console.log('    bundle → ' + manifest.bundle);
Object.entries(manifest.files).forEach(([logical, hashed]) => {
  console.log('    ' + logical.padEnd(38) + ' → ' + hashed);
});
console.log('');

console.log('  Sizes:');
const allFiles = {
  'embed.js (loader)': loader.length,
  [manifest.bundle + ' (bundle)']: embed.length,
  'manifest.json': manifestJson.length,
  'manifest.js': manifestJs.length,
  'index.html': standaloneHtml.length,
  'example-inline.html': sampleHtml.length,
};
Object.entries(manifest.files).forEach(([, hashed]) => {
  allFiles[hashed] = fs.statSync(path.join('dist', hashed.replace(/\//g, path.sep))).size;
});
Object.entries(allFiles).forEach(([name, size]) => {
  console.log(`    ${name.padEnd(55)} ${(size / 1024).toFixed(1)} KB`);
});
