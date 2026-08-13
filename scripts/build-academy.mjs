// scripts/build-academy.mjs — converts academy/*.md into src/academy_docs.js
// Generates: window.ACADEMY_DOCS = { id: { title, html, updated, order } }
// Run: node scripts/build-academy.mjs
// Ids are stable slugs; order mirrors the sidebar. Handles the markdown subset
// used by the academy docs: ATX headings, tables, fenced+inline code, bold/
// italic, links, blockquotes, ordered/unordered lists (incl. nested), hr, emoji.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const academyDir = join(root, 'academy');
const outPath = join(root, 'src', 'academy_docs.js');

// Sidebar order: README hub first, then gameplay → lore → client → ops.
const ORDER = [
  'README.md',
  'mining.md',
  'production-101.md',
  'armor-101.md',
  'attributes-101.md',
  'drugs.md',
  'final-battle.md',
  'fom-knowledge.md',
  'fom-baseline.md',
  'client-catalog.md',
  'client-re.md',
  'models-and-textures.md',
  'wipe-plan.md',
  'discord-integration.md',
];

const esc = s => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// Inline pass: `code`, **bold**, *italic*, [text](url). Applied AFTER block-level
// splitting so code spans never get re-processed for bold/italic.
function inline(src) {
  let s = esc(src);
  // inline code first (protects its contents)
  s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  // links — external http(s) and internal .md cross-refs
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  s = s.replace(/\[([^\]]+)\]\(([a-z0-9-]+\.md(?:#[^)\s]*)?)\)/g, '<a href="$2">$1</a>');
  // bold
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // italic
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return s;
}

function renderTable(rows) {
  // rows: array of cell-arrays (first = header). Drop separator rows (|---|---|).
  const isSep = r => r.length && r.every(c => /^:?-{2,}:?$/.test(c.trim()));
  const header = rows[0];
  const body = rows.slice(1).filter(r => !isSep(r));
  const thead = `<thead><tr>${header.map(c => `<th>${inline(c.trim())}</th>`).join('')}</tr></thead>`;
  const tbody = body.length
    ? `<tbody>${body.map(r => `<tr>${r.map(c => `<td>${inline(c.trim())}</td>`).join('')}</tr>`).join('')}</tbody>`
    : '';
  return `<table>${thead}${tbody}</table>`;
}

function mdToHtml(md) {
  const lines = md.split('\n');
  const out = [];
  let i = 0;

  const flushList = (items, ordered) => {
    // items: array of { level, text, ordered }
    let html = '';
    const tag = ordered ? 'ol' : 'ul';
    html += `<${tag}>`;
    for (const it of items) html += `<li>${inline(it.text)}</li>`;
    html += `</${tag}>`;
    out.push(html);
  };

  while (i < lines.length) {
    const line = lines[i];

    // fenced code block
    if (/^```/.test(line)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++; // consume closing fence
      out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }

    // table block
    if (/^\|/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        const cells = lines[i].split('|').slice(1, -1);
        rows.push(cells);
        i++;
      }
      out.push(renderTable(rows));
      continue;
    }

    // ATX headings
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) { out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }

    // horizontal rule
    if (/^\s*(---|\*\*\*)\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

    // blockquote (collect consecutive)
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
      out.push(`<blockquote>${buf.map(b => inline(b)).join('<br>')}</blockquote>`);
      continue;
    }

    // unordered list (collect consecutive lines, support 2-space nesting)
    if (/^[-*]\s+/.test(line) || /^\s{2}[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && (/^[-*]\s+/.test(lines[i]) || /^\s{2}[-*]\s+/.test(lines[i]))) {
        const l = lines[i];
        const level = /^\s{2}/.test(l) ? 1 : 0;
        items.push({ level, text: l.replace(/^\s{0,2}[-*]\s+/, '') });
        i++;
      }
      // Nested: split top-level and nested into separate <ul>s (approximation
      // acceptable for these docs — no 3-level nesting used).
      const top = items.filter(x => x.level === 0);
      const nested = items.filter(x => x.level === 1);
      let html = '<ul>';
      for (const it of top) html += `<li>${inline(it.text)}</li>`;
      if (nested.length) {
        html += '<li><ul>';
        for (const it of nested) html += `<li>${inline(it.text)}</li>`;
        html += '</ul></li>';
      }
      html += '</ul>';
      out.push(html);
      continue;
    }

    // ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push({ text: lines[i].replace(/^\d+\.\s+/, '') });
        i++;
      }
      flushList(items, true);
      continue;
    }

    // blank line
    if (!line.trim()) { i++; continue; }

    // paragraph (collect until blank / block start)
    const buf = [];
    while (i < lines.length && lines[i].trim() &&
           !/^```/.test(lines[i]) && !/^\|/.test(lines[i]) &&
           !/^#{1,4}\s/.test(lines[i]) && !/^>/.test(lines[i]) &&
           !/^[-*]\s+/.test(lines[i]) && !/^\d+\.\s+/.test(lines[i]) &&
           !/^\s*(---|\*\*\*)\s*$/.test(lines[i])) {
      buf.push(lines[i]); i++;
    }
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  return out.join('\n');
}

function slug(file) { return file.replace(/\.md$/, ''); }

// Extract a one-line summary: first sentence of the first paragraph after the
// H1, from the raw markdown (strip emphasis/link/code syntax), capped ~110 chars.
function summaryOf(raw) {
  const body = raw.replace(/^#\s+.+$/m, '').trim();
  const para = body.split(/\n\n+/).find(p => p.trim() && !/^[#|>-]/.test(p.trim()));
  if (!para) return '';
  let t = para
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
  const dot = t.search(/[.!?](?:\s|$)/);
  if (dot > 0) t = t.slice(0, dot + 1);
  if (t.length > 110) t = t.slice(0, 107) + '…';
  return t;
}

const files = readdirSync(academyDir).filter(f => f.endsWith('.md'));
const docs = {};

for (const f of files) {
  const raw = readFileSync(join(academyDir, f), 'utf8');
  // The view (src/views/academy.js) already renders the doc title in the head,
  // so drop the leading H1 from the body to avoid a duplicated title card.
  const body = raw.replace(/^\s*#\s+.+$/m, '');
  const html = mdToHtml(body);
  const titleMatch = raw.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : f.replace(/\.md$/, '').replace(/-/g, ' ');
  const order = ORDER.indexOf(f) === -1 ? 999 : ORDER.indexOf(f);
  docs[slug(f)] = { title, html, summary: summaryOf(raw), order };
}

const js = `// GENERATED by node scripts/build-academy.mjs — edit academy/*.md, not this file.
window.ACADEMY_DOCS = ${JSON.stringify(docs)};\n`;

writeFileSync(outPath, js);
const ids = Object.keys(docs).sort((a, b) => docs[a].order - docs[b].order);
console.log(`[build-academy] ${outPath} (${js.length} bytes) — ${ids.length} docs:`);
ids.forEach(id => console.log(`  ${docs[id].order}. ${docs[id].title}`));
