const fs = require('fs');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function toDataUri(file, mimeType) {
  return `data:${mimeType};base64,${fs.readFileSync(file).toString('base64')}`;
}

function replaceAssetSources(html) {
  const logoUri = toDataUri('abra-logo-2026.svg', 'image/svg+xml');
  html = html.replace('src="abra-logo-2026.svg"', `src="${logoUri}"`);

  [
    ['preview-table.png', 'image/png'],
    ['preview-cards.png', 'image/png']
  ].forEach(([file, mimeType]) => {
    if (fs.existsSync(file)) {
      html = html.replace(`src="${file}"`, `src="${toDataUri(file, mimeType)}"`);
    }
  });

  return html;
}

function extractBetween(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Could not extract ${label}`);
  }
  return source.slice(start + startMarker.length, end);
}

let sourceHtml = replaceAssetSources(read('index.dev.html'));

const styleMatch = sourceHtml.match(/<style>([\s\S]*?)<\/style>/);
if (!styleMatch) throw new Error('Could not extract styles from index.dev.html');
const styles = styleMatch[1].trim();

const appTemplate = extractBetween(
  sourceHtml,
  '<!-- APP_TEMPLATE_START -->',
  '<!-- APP_TEMPLATE_END -->',
  'app template'
).trim();

const runtimeScriptMatch = sourceHtml.match(/<script>\s*(\/\/ === Active format — set on XML load, used everywhere ===[\s\S]*?)<\/script>\s*<\/body>/);
if (!runtimeScriptMatch) throw new Error('Could not extract runtime script from index.dev.html');
const runtimeScript = runtimeScriptMatch[1].trim();

const vue = read('vue.global.prod.js');
const xmllint = read('xmllint-wasm-bundle.js');
const xsd = read('xsd-data.js');
const jmhzXsd = read('jmhz-xsd-data.js');
const formats = read('formats.js');

let standaloneHtml = sourceHtml;
standaloneHtml = standaloneHtml.replace('<script src="vue.global.prod.js"></script>', '<script>' + vue + '</script>');
standaloneHtml = standaloneHtml.replace('<script src="xmllint-wasm-bundle.js"></script>', '<script>' + xmllint + '</script>');
standaloneHtml = standaloneHtml.replace('<script src="xsd-data.js"></script>', '<script>' + xsd + '</script>');
standaloneHtml = standaloneHtml.replace('<script src="jmhz-xsd-data.js"></script>', '<script>' + jmhzXsd + '</script>');
standaloneHtml = standaloneHtml.replace('<script src="formats.js"></script>', '<script>' + formats + '</script>');

const embedJs = `(() => {
const JMHZ_VIEWER_STYLES = ${JSON.stringify(styles)};
const JMHZ_VIEWER_TEMPLATE = ${JSON.stringify(appTemplate)};

function ensureViewerStyles() {
  if (document.querySelector('style[data-jmhz-viewer]')) return;
  const styleEl = document.createElement('style');
  styleEl.setAttribute('data-jmhz-viewer', '');
  styleEl.textContent = JMHZ_VIEWER_STYLES;
  document.head.appendChild(styleEl);
}

${vue}
window.Vue = Vue;
${xmllint}
${xsd}
${jmhzXsd}
${formats}
${runtimeScript}

window.JMHZViewer = {
  mount(target, options = {}) {
    const targetEl = typeof target === 'string' ? document.querySelector(target) : target;
    if (!targetEl) throw new Error('JMHZ Viewer mount target not found');
    ensureViewerStyles();
    targetEl.classList.add('app', 'jmhz-viewer-host');
    targetEl.innerHTML = JMHZ_VIEWER_TEMPLATE;
    return window.JMHZViewerRuntime.mount(targetEl, {
      manageDocumentTitle: false,
      warnBeforeUnload: false,
      ...options
    });
  }
};
})();`;

const sampleEmbedHost = `<!DOCTYPE html>
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
  </script>
  <script src="https://support.flexibee.eu/service/jmhz-viewer/embed.js"></script>
  <script>
    window.JMHZViewer.mount('#jmhz-viewer-root', {
      initialViewMode: 'cards',
      autoValidateOnLoad: true
    });
  </script>
</body>
</html>
`;

fs.writeFileSync('embed.js', embedJs);
fs.writeFileSync('index.html', standaloneHtml);
fs.writeFileSync('sample-inline-mh.html', sampleEmbedHost);

console.log(`Built: embed.js (${(embedJs.length / 1024 / 1024).toFixed(2)} MB)`);
console.log(`Built: index.html (${(standaloneHtml.length / 1024 / 1024).toFixed(2)} MB)`);
console.log(`Built: sample-inline-mh.html (${(sampleEmbedHost.length / 1024).toFixed(1)} KB)`);
