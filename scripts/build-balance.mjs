// scripts/build-balance.mjs — generates src/balance_stats.js from data/balance_stats.json
// (the live ER Balance Sheet ingest). Follows the build-data.mjs pattern.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dataPath = join(root, 'data', 'balance_stats.json');
const outPath = join(root, 'src', 'balance_stats.js');

const data = JSON.parse(readFileSync(dataPath, 'utf8'));
const errors = [];

data.items.forEach((it, i) => {
  if (!it.name) errors.push(`items[${i}]: missing name`);
  if (it.stats && typeof it.stats !== 'object') errors.push(`items[${i}] (${it.name}): stats not an object`);
});

if (errors.length) {
  console.error(`[build-balance] ${errors.length} validation errors:`);
  errors.forEach(e => console.error('  -', e));
  process.exit(1);
}

const js = `// GENERATED — edit data/balance_stats.json (or re-run scripts/update_balance_stats.py)
window.BALANCE_STATS = ${JSON.stringify(data, null, 2)};
`;

writeFileSync(outPath, js);
console.log(`[build-balance] Generated ${outPath} (${js.length} bytes) from ${dataPath}`);
console.log(`  ${data.items.length} items (fetched ${data._meta.fetched})`);
