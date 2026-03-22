const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');
const vue = fs.readFileSync('vue.global.prod.js', 'utf8');
const xmllint = fs.readFileSync('xmllint-wasm-bundle.js', 'utf8');
const xsd = fs.readFileSync('xsd-data.js', 'utf8');

html = html.replace('<script src="vue.global.prod.js"></script>', '<script>' + vue + '</script>');
html = html.replace('<script src="xmllint-wasm-bundle.js"></script>', '<script>' + xmllint + '</script>');
html = html.replace('<script src="xsd-data.js"></script>', '<script>' + xsd + '</script>');

fs.writeFileSync('dist/regzec-editor.html', html);
console.log('Built: dist/regzec-editor.html (' + (html.length / 1024 / 1024).toFixed(2) + ' MB)');
