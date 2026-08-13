import { defineConfig } from 'vite';
import { resolve } from 'node:path';

function normalizeGeneratedWhitespace() {
  return {
    name: 'er-normalize-generated-whitespace',
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type === 'chunk') output.code = output.code.replace(/\n[ \t]+\n/g, '\n\n');
      }
    },
  };
}

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  plugins: [normalizeGeneratedWhitespace()],
  build: {
    lib: {
      entry: resolve(process.cwd(), 'src/3d/entry.jsx'),
      name: 'ER3DBundle',
      formats: ['iife'],
      fileName: () => 'er-3d-workbench.js',
    },
    outDir: resolve(process.cwd(), 'src/generated'),
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',
  },
});
