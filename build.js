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

// ── Source files ──────────────────────────────────────────────
const css       = read('src/styles/viewer.css');
const template  = read('src/ui/template.js');
const helpers   = read('src/runtime/helpers.js');
const viewer    = read('src/runtime/viewer.js');
const loader    = read('src/entrypoints/loader.js');
const embed     = read('src/entrypoints/embed.js');
const formats   = read('formats.js');

// ── Build viewer.runtime.js (template + helpers + viewer) ────
const viewerRuntime = [template, helpers, viewer].join('\n\n');

// ── Build dist/index.html (standalone, no inlining) ─────────
const standaloneHtml = `<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>JMHZ Viewer</title>
<script src="vendor/vue.global.prod.js"><\/script>
<script src="vendor/xmllint-wasm-bundle.js"><\/script>
<script src="data/xsd-data.js"><\/script>
<script src="data/jmhz-xsd-data.js"><\/script>
<script src="formats.js"><\/script>
<link rel="stylesheet" href="viewer.css">
</head>
<body>
<div id="app" class="app"></div>
<script id="jmhz-data" type="application/xml"></script>
<script src="viewer.runtime.js"><\/script>
<script>
var _target = document.getElementById('app');
if (_target) {
  _target.innerHTML = window.JMHZ_VIEWER_TEMPLATE;
  mountJmhzViewer(_target, { manageDocumentTitle: true, warnBeforeUnload: true });
}
<\/script>
</body>
</html>`;

// ── Build sample-inline.html (integration template) ─────────
const sampleHtml = `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ukázka integrace JMHZ Vieweru</title>
</head>
<body>
  <!--
    Ukázka integrace:
    - aplikace vygeneruje tento HTML soubor
    - XML vloží do <script id="jmhz-data" type="application/xml">
    - aplikace nastaví i data-filename na název generovaného XML souboru
    - viewer se načte z produkční URL a XML přečte přímo z této stránky
  -->
  <div id="jmhz-viewer-root"></div>
  <script id="jmhz-data" type="application/xml" data-filename="mesicni-hlaseni-2026-03.xml">
<!--
  Vložte celý XML dokument místo komentáře.
  Hodnotu data-filename nastavte na skutečný název XML souboru.
  Např.:
  <?xml version="1.0" encoding="UTF-8"?>
  <jmhz>...</jmhz>
-->
  <\/script>
  <script src="https://support.flexibee.eu/service/jmhz-viewer/embed.js"><\/script>
  <script>
    // ── Mount ────────────────────────────────────────────────
    // mount(target, options) → Promise<handle>
    //   target   CSS selektor nebo DOM element
    //   options:
    //     initialViewMode      'cards' | 'table' (výchozí: automaticky)
    //     autoValidateOnLoad   true/false – spustí validaci ihned po načtení XML
    //     manageDocumentTitle  true/false – aktualizuje <title> stránky
    //     onReady              function(handle) – zavolá se po připojení vieweru
    //
    // ── Handle (vrácený z mount / předaný do onReady) ────────
    //   handle.validate()              spustí XSD validaci, vrátí Promise
    //   handle.loadXml(xml, filename)  načte XML řetězec do vieweru
    //   handle.destroy()               odpojí viewer z DOM
    //   handle.getState()              → { filename, isDirty, errorCount,
    //                                      employeeCount, hasData }

    window.JMHZViewer.mount('#jmhz-viewer-root', {
      initialViewMode: 'cards',
      autoValidateOnLoad: true,
      manageDocumentTitle: true,
      onReady: function (handle) {
        console.log('JMHZ Viewer ready', handle.getState());
      }
    });
  <\/script>
</body>
</html>`;

// ── Write outputs ────────────────────────────────────────────
ensureDir('dist');
ensureDir('dist/vendor');
ensureDir('dist/data');

// Core runtime and styles
fs.writeFileSync('dist/viewer.runtime.js', viewerRuntime);
fs.writeFileSync('dist/viewer.css', css);
fs.writeFileSync('dist/formats.js', formats);

// Embed: stable loader + hashed bundle + manifest
const embedHash = crypto.createHash('sha256').update(embed).digest('hex').slice(0, 8);
const embedBundleName = 'embed_' + embedHash + '.js';

// Clean up stale bundles, keeping 1 most recent previous version
const stalePattern = /^embed_[0-9a-f]{8}\.js$/;
const staleBundles = fs.readdirSync('dist')
  .filter(f => stalePattern.test(f) && f !== embedBundleName)
  .map(f => ({ name: f, mtime: fs.statSync('dist/' + f).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime);
// Keep the most recent previous bundle, delete the rest
staleBundles.slice(1).forEach(f => {
  fs.unlinkSync('dist/' + f.name);
  console.log('  Removed stale bundle: ' + f.name);
});

fs.writeFileSync('dist/embed.js', loader);
fs.writeFileSync('dist/' + embedBundleName, embed);
fs.writeFileSync('dist/manifest.json', JSON.stringify({ file: embedBundleName }) + '\n');

// HTML pages
fs.writeFileSync('dist/index.html', standaloneHtml);
fs.writeFileSync('dist/sample-inline.html', sampleHtml);

// Vendor libraries (not inlined — copied as separate files)
copyFile('vue.global.prod.js',      'dist/vendor/vue.global.prod.js');
copyFile('xmllint-wasm-bundle.js',  'dist/vendor/xmllint-wasm-bundle.js');

// Schema / data files
copyFile('xsd-data.js',       'dist/data/xsd-data.js');
copyFile('jmhz-xsd-data.js',  'dist/data/jmhz-xsd-data.js');

// Assets (images — not inlined)
['abra-logo-2026.svg', 'preview-table.png', 'preview-cards.png'].forEach(file => {
  if (fs.existsSync(file)) copyFile(file, 'dist/' + file);
});

// ── Summary ──────────────────────────────────────────────────
const sizes = {
  'viewer.runtime.js': viewerRuntime.length,
  'viewer.css': css.length,
  ['embed.js (loader)']: loader.length,
  [embedBundleName + ' (bundle)']: embed.length,
  'manifest.json': JSON.stringify({ file: embedBundleName }).length + 1,
  'index.html': standaloneHtml.length,
  'sample-inline.html': sampleHtml.length,
  'formats.js': formats.length,
};

console.log('Built to dist/:');
Object.entries(sizes).forEach(([name, size]) => {
  const kb = (size / 1024).toFixed(1);
  console.log(`  ${name.padEnd(35)} ${kb} KB`);
});

const vendorFiles = fs.readdirSync('dist/vendor');
vendorFiles.forEach(f => {
  const size = fs.statSync('dist/vendor/' + f).size;
  console.log(`  vendor/${f.padEnd(28)} ${(size / 1024).toFixed(1)} KB`);
});

const dataFiles = fs.readdirSync('dist/data');
dataFiles.forEach(f => {
  const size = fs.statSync('dist/data/' + f).size;
  console.log(`  data/${f.padEnd(30)} ${(size / 1024).toFixed(1)} KB`);
});
