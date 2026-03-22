#!/usr/bin/env node
/**
 * Build script: creates xmllint-wasm-bundle.js
 * - Extracts Module factory from xmllint-browser.mjs (strips Worker bootstrap)
 * - Extracts utility functions from index-browser.mjs
 * - Base64-encodes xmllint.wasm
 * - Wraps in IIFE exposing window.validateXML
 */
const fs = require('fs');
const path = require('path');

const PKG = path.join(__dirname, 'node_modules', 'xmllint-wasm');

// 1. Read and base64-encode WASM
const wasmBuf = fs.readFileSync(path.join(PKG, 'xmllint.wasm'));
const wasmBase64 = wasmBuf.toString('base64');
console.log(`WASM: ${wasmBuf.length} bytes -> ${wasmBase64.length} base64 chars`);

// 2. Read Module factory — strip the Worker bootstrap at the end
let moduleSrc = fs.readFileSync(path.join(PKG, 'xmllint-browser.mjs'), 'utf8');
// Strip Worker bootstrap: starts with ";(function initWorker()" near end of file
const initWorkerIdx = moduleSrc.indexOf(';(function initWorker()');
if (initWorkerIdx === -1) throw new Error('Could not find ;(function initWorker() to strip');
moduleSrc = moduleSrc.substring(0, initWorkerIdx).trimEnd();
console.log(`Module factory: ${moduleSrc.length} chars (stripped Worker bootstrap)`);

// 3. Read utility functions from index-browser.mjs — copy verbatim from memoryPages to before validateXML
let indexSrc = fs.readFileSync(path.join(PKG, 'index-browser.mjs'), 'utf8');
// Take from "const memoryPages" to just before the Worker-based "function validateXML("
const utilStart = indexSrc.indexOf('const memoryPages');
const utilEnd = indexSrc.indexOf('/** @type {import("./index").validateXML} */');
if (utilStart === -1) throw new Error('Could not find const memoryPages');
// If the JSDoc marker isn't found, try finding "function validateXML" directly
const actualEnd = utilEnd !== -1 ? utilEnd : indexSrc.indexOf('\nfunction validateXML(');
if (actualEnd === -1) throw new Error('Could not find end of utility functions');
let utilSrc = indexSrc.substring(utilStart, actualEnd).trimEnd();
// Remove 'use strict' if present
utilSrc = utilSrc.replace(/^'use strict';\s*/, '');
console.log(`Utility functions: ${utilSrc.length} chars`);

// 4. Build the IIFE bundle
const bundle = `// xmllint-wasm-bundle.js — auto-generated, do not edit
// Built from xmllint-wasm npm package with inlined WASM binary
(function() {
'use strict';

// === Base64-encoded WASM binary ===
var WASM_BASE64 = "${wasmBase64}";

// === Decode base64 to Uint8Array ===
function decodeBase64(b64) {
  var bin = atob(b64);
  var bytes = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
var wasmBytes = decodeBase64(WASM_BASE64);

// === Emscripten Module factory (from xmllint-browser.mjs, Worker bootstrap stripped) ===
${moduleSrc}

// === Utility functions (from index-browser.mjs) ===
${utilSrc}

// === Main-thread validateXML (replaces Worker-based version) ===
function validateXML(options) {
  var preprocessedOptions = preprocessOptions(options);

  return new Promise(function(resolve, reject) {
    var stdout = '';
    var stderr = '';

    function onExit(exitCode) {
      var valid = validationSucceeded(exitCode);
      if (valid === null) {
        var err = new Error(stderr);
        err.code = exitCode;
        reject(err);
      } else {
        resolve({
          valid: valid,
          normalized: stdout,
          errors: valid ? [] : parseErrors(stderr),
          rawOutput: stderr
        });
      }
    }

    var wasmMemory = new WebAssembly.Memory({
      initial: preprocessedOptions.initialMemory,
      maximum: preprocessedOptions.maxMemory
    });

    Module({
      inputFiles: preprocessedOptions.inputFiles,
      arguments: preprocessedOptions.args,
      wasmBinary: wasmBytes.buffer,
      wasmMemory: wasmMemory,
      print: function(text) { stdout += text + '\\n'; },
      printErr: function(text) { stderr += text + '\\n'; },
      onExit: onExit,
    });
  });
}

// === Export as globals ===
window.validateXML = validateXML;
window.xmllintMemoryPages = memoryPages;

})();
`;

fs.writeFileSync(path.join(__dirname, 'xmllint-wasm-bundle.js'), bundle);
console.log(`Bundle written: ${bundle.length} chars (${(bundle.length / 1024 / 1024).toFixed(2)} MB)`);
