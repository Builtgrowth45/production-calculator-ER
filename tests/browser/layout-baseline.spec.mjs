// Phase 0 baseline smoke contract.
// This deliberately uses only Node's built-in test/fetch APIs so the existing
// zero-dependency project can verify its served shell before Playwright is
// introduced. Interactive view traversal was also exercised manually in the
// browser and is recorded in docs/design/ux-baseline.md.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = (process.env.BASELINE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');

async function get(path) {
  const response = await fetch(`${baseUrl}${path}`);
  assert.equal(response.ok, true, `${path} returned HTTP ${response.status}`);
  return { response, body: await response.text() };
}

function unique(values) {
  return [...new Set(values)];
}

describe('served layout baseline', () => {
  it('serves every declared view and its referenced shell assets', async () => {
    const { body: html } = await get('/');
    const views = unique([...html.matchAll(/<section\s+id="view-([^"]+)"/g)].map(m => m[1]));
    const tabs = unique([...html.matchAll(/data-view="([^"]+)"/g)].map(m => m[1]));

    assert.ok(views.length >= 16, `expected at least 16 views, found ${views.length}`);
    assert.deepEqual([...tabs].sort(), [...views].sort(), 'navigation and panels must stay in sync');
    assert.equal(views.length, new Set(views).size, 'view IDs must be unique');

    const assets = unique([
      ...[...html.matchAll(/<link[^>]+href="([^"]+)"/g)].map(m => m[1]),
      ...[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]),
    ]).filter(asset => !/^(?:https?:)?\/\//.test(asset));

    for (const asset of assets) {
      await get(`/${asset.split('?')[0].replace(/^\//, '')}`);
    }
  });

  it('keeps the legacy two-view WebGL baseline explicit for migration tracking', async () => {
    const { body: models } = await get('/src/views/models.js');
    const { body: character } = await get('/src/views/character.js');
    for (const source of [models, character]) {
      assert.match(source, /new THREE\.WebGLRenderer/);
      assert.match(source, /requestAnimationFrame/);
      assert.match(source, /preserveDrawingBuffer\s*:\s*true/);
    }
  });
});
