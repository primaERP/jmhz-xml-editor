import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  build: {
    lib: {
      entry: 'src/runtime/viewer-entry.jsx',
      name: 'JMHZViewerRuntime',
      formats: ['iife'],
      fileName: () => 'viewer.runtime.js'
    },
    outDir: 'build-intermediate',
    emptyOutDir: true
  }
});
