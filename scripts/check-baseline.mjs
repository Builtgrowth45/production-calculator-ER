#!/usr/bin/env node
/**
 * scripts/check-baseline.mjs — self-contained served-shell baseline runner.
 *
 * Serves dist/ over loopback and runs tests/browser/layout-baseline.spec.mjs
 * against it, tearing the server down when the suite finishes. Uses Node
 * built-ins only (no extra dependencies), so `npm run check` can run the
 * served-shell contract locally and in CI after `npm run build`.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');
const dist = resolve(root, 'dist');
const spec = join(root, 'tests', 'browser', 'layout-baseline.spec.mjs');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.mp3': 'audio/mpeg',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
};

async function serve(req, res) {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    const file = normalize(join(dist, pathname));
    if (file !== dist && !file.startsWith(dist + sep)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }
    const info = await stat(file);
    if (info.isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': body.length,
    });
    res.end(body);
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Server error');
    }
  }
}

async function main() {
  try {
    await stat(join(dist, 'index.html'));
  } catch {
    console.error('[check-baseline] dist/index.html not found — run `npm run build` first.');
    process.exit(1);
  }

  const server = createServer(serve);
  await new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const { port } = server.address();
  console.log(`[check-baseline] serving ${dist} at http://127.0.0.1:${port}`);

  const child = spawn(process.execPath, ['--test', spec], {
    env: { ...process.env, BASELINE_URL: `http://127.0.0.1:${port}` },
    stdio: 'inherit',
  });
  child.on('exit', code => {
    server.close(() => process.exit(code ?? 1));
    server.closeAllConnections?.();
  });
}

main().catch(err => {
  console.error('[check-baseline]', err);
  process.exit(1);
});
