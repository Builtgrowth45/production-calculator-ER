#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'data', 'asset-provenance.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const failures = [];
const binaryExt = new Set(['.png', '.webp', '.jpg', '.jpeg', '.gif', '.svg', '.glb', '.gltf', '.ogg', '.mp3', '.wav', '.dtx', '.stl', '.woff', '.woff2']);
const ignored = new Set(['node_modules', '.git', 'dist']);

function filesUnder(relative) {
  const base = relative.replace('/**', '').split(',')[0].trim();
  const absolute = path.join(root, base);
  if (!fs.existsSync(absolute)) return [];
  const out = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push(path.relative(root, full).replaceAll(path.sep, '/'));
    }
  };
  if (fs.statSync(absolute).isDirectory()) walk(absolute);
  else out.push(relative);
  return out;
}

const binaryFiles = [];
const walkRoot = dir => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkRoot(full);
    else if (binaryExt.has(path.extname(entry.name).toLowerCase())) binaryFiles.push(path.relative(root, full).replaceAll(path.sep, '/'));
  }
};
walkRoot(root);

for (const file of binaryFiles) {
  const record = manifest.records.find(r => {
    const prefix = r.path.replace('/**', '').split(',')[0].trim();
    return file === prefix || file.startsWith(`${prefix}/`);
  });
  if (!record) failures.push(`${file}: no provenance record`);
  else if (!['approved', 'approved_for_code_review'].includes(record.status)) failures.push(`${file}: status=${record.status}`);
}

if (failures.length) {
  const reportOnly = process.argv.includes('--report-only');
  console.error(`Asset provenance gate found ${failures.length} file(s) requiring review.`);
  console.error(failures.slice(0, 25).join('\n'));
  if (failures.length > 25) console.error(`... plus ${failures.length - 25} more`);
  if (!reportOnly) process.exit(1);
  console.error('Report-only mode: continuing without approving these assets.');
  process.exit(0);
}
console.log(`Asset provenance gate passed for ${binaryFiles.length} binary file(s).`);
