const fs = require('fs');
const path = require('path');

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

// ── Build sample-inline-mh.html (partner template) ──────────
const sampleHtml = `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ukázka integrace JMHZ Vieweru</title>
</head>
<body>
  <!--
    Ukázka pro sesterský produkt:
    1) aplikace vygeneruje celý tento HTML soubor
    2) místo komentáře níže vloží skutečný XML obsah
    3) soubor se otevře v prohlížeči
    4) viewer se načte z produkční URL a XML přečte přímo z této stránky
  -->
  <div id="jmhz-viewer-root"></div>
  <script id="jmhz-data" type="application/xml" data-filename="mh.xml">
<!--
  SEM VLOŽTE SKUTEČNÝ XML OBSAH.

  Příklad:
  <?xml version="1.0" encoding="UTF-8"?>
  <jmhz>...</jmhz>

  Tento komentář nahraďte kompletním XML dokumentem.
-->
  <\/script>
  <script src="https://support.flexibee.eu/service/jmhz-viewer/embed.js"><\/script>
  <script>
    window.JMHZViewer.mount('#jmhz-viewer-root', {
      initialViewMode: 'cards',
      autoValidateOnLoad: true
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
fs.writeFileSync('dist/embed.js', embed);

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
  'embed.js': embed.length,
  'index.html': standaloneHtml.length,
  'sample-inline.html': sampleHtml.length,
  'formats.js': formats.length,
};

console.log('Built to dist/:');
Object.entries(sizes).forEach(([name, size]) => {
  const kb = (size / 1024).toFixed(1);
  console.log(`  ${name.padEnd(28)} ${kb} KB`);
});

const vendorFiles = fs.readdirSync('dist/vendor');
vendorFiles.forEach(f => {
  const size = fs.statSync('dist/vendor/' + f).size;
  console.log(`  vendor/${f.padEnd(21)} ${(size / 1024).toFixed(1)} KB`);
});

const dataFiles = fs.readdirSync('dist/data');
dataFiles.forEach(f => {
  const size = fs.statSync('dist/data/' + f).size;
  console.log(`  data/${f.padEnd(23)} ${(size / 1024).toFixed(1)} KB`);
});
