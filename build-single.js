const fs = require('fs');

let html = fs.readFileSync('index.dev.html', 'utf8');
const vue = fs.readFileSync('vue.global.prod.js', 'utf8');
const xmllint = fs.readFileSync('xmllint-wasm-bundle.js', 'utf8');
const xsd = fs.readFileSync('xsd-data.js', 'utf8');
const jmhzXsd = fs.readFileSync('jmhz-xsd-data.js', 'utf8');
const formats = fs.readFileSync('formats.js', 'utf8');

const svg = fs.readFileSync('abra-logo-2026.svg', 'utf8');
const svgDataUri = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
html = html.replace('src="abra-logo-2026.svg"', 'src="' + svgDataUri + '"');

html = html.replace('<script src="vue.global.prod.js"></script>', '<script>' + vue + '</script>');
html = html.replace('<script src="xmllint-wasm-bundle.js"></script>', '<script>' + xmllint + '</script>');
html = html.replace('<script src="xsd-data.js"></script>', '<script>' + xsd + '</script>');
html = html.replace('<script src="jmhz-xsd-data.js"></script>', '<script>' + jmhzXsd + '</script>');
html = html.replace('<script src="formats.js"></script>', '<script>' + formats + '</script>');

fs.writeFileSync('dist/jmhz-editor.html', html);
console.log('Built: dist/jmhz-editor.html (' + (html.length / 1024 / 1024).toFixed(2) + ' MB)');
