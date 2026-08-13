/**
 * src/views/academy.js — Academy tab
 * ============================================================================
 * Renders the CMG Academy knowledge base (academy/*.md, pre-converted to HTML
 * by scripts/build-academy.mjs into window.ACADEMY_DOCS). Left sidebar = doc
 * list with search; main pane = the selected doc, rendered read-only.
 */
'use strict';

function renderAcademy() {
  const wrap = document.getElementById('academy-wrap');
  if (!wrap || !window.ACADEMY_DOCS) return;

  const entries = Object.entries(window.ACADEMY_DOCS)
    .sort((a, b) => (a[1].order ?? 999) - (b[1].order ?? 999));

  const q = (document.getElementById('academy-search')?.value || '').toLowerCase();
  const list = document.getElementById('academy-list');
  const pane = document.getElementById('academy-pane');

  // ── Sidebar ──────────────────────────────────────────────────────────────
  const visible = entries.filter(([, d]) => !q || d.title.toLowerCase().includes(q) || (d.summary || '').toLowerCase().includes(q));
  list.innerHTML = visible.map(([id, d]) => {
    const active = pane.dataset.doc === id;
    return `<button type="button" class="academy-doc ${active ? 'active' : ''}" data-academy-doc="${esc(id)}">
        <span class="academy-doc-title">${esc(d.title)}</span>
        ${d.summary ? `<span class="academy-doc-summary">${esc(d.summary)}</span>` : ''}
      </button>`;
  }).join('');

  list.querySelectorAll('[data-academy-doc]').forEach(b => {
    b.addEventListener('click', () => {
      selectAcademyDoc(b.dataset.academyDoc);
    });
  });

  if (!pane.dataset.doc || !window.ACADEMY_DOCS[pane.dataset.doc]) {
    selectAcademyDoc('README');
  } else {
    renderAcademyPane();
  }
}

function selectAcademyDoc(id) {
  if (!window.ACADEMY_DOCS[id]) return;
  const pane = document.getElementById('academy-pane');
  pane.dataset.doc = id;
  renderAcademyPane();
  document.querySelectorAll('.academy-doc').forEach(x =>
    x.classList.toggle('active', x.dataset.academyDoc === id));
}

function renderAcademyPane() {
  const pane = document.getElementById('academy-pane');
  const id = pane.dataset.doc;
  const doc = window.ACADEMY_DOCS[id];
  if (!doc) { pane.innerHTML = '<p class="muted">Doc not found.</p>'; return; }
  pane.innerHTML = `
    <div class="academy-doc-head">
      <h4 class="academy-doc-heading">${esc(doc.title)}</h4>
      <span class="muted academy-doc-meta">CMG Academy · member knowledge base</span>
    </div>
    <div class="academy-doc-body">${doc.html}</div>`;
  // Delegate: internal [text](mining.md) links switch docs; external open new tab.
  pane.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (href && href.endsWith('.md')) {
      const target = href.replace(/\.md$/, '');
      if (window.ACADEMY_DOCS[target]) {
        a.addEventListener('click', e => {
          e.preventDefault();
          selectAcademyDoc(target);
          const btn = document.querySelector(`[data-academy-doc="${esc(target)}"]`);
          if (btn) btn.scrollIntoView({ block: 'nearest' });
        });
      }
    }
  });
}

function initAcademyView() {
  const search = document.getElementById('academy-search');
  if (search) search.addEventListener('input', () => renderAcademy());
  renderAcademy();
}
