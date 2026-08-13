/**
 * src/views/help.js — Data correction workflow
 * ============================================================================
 * Renders game data in markdown for community correction submissions.
 */
'use strict';

// HELP FIX DATA — shows all backing data in markdown
// ═══════════════════════════════════════════════════════════════════════

function initHelpView() {
  const sec = document.getElementById('help-section');
  const inp = document.getElementById('help-search');
  const btn = document.getElementById('help-copy-all');
  if (sec) sec.addEventListener('change', renderHelpView);
  if (inp) inp.addEventListener('input', renderHelpView);
  if (btn) btn.addEventListener('click', helpCopyAll);
  renderHelpView();
}

function renderHelpView() {
  const list = document.getElementById('help-list');
  if (!list) return;
  const secEl = document.getElementById('help-section');
  const sec = secEl ? secEl.value : 'recipes';
  const q = (document.getElementById('help-search')?.value || '').toLowerCase();
  if (sec === 'recipes') helpRenderRecipes(list, q);
  else if (sec === 'mining') helpRenderMining(list, q);
  else helpRenderItems(list, q);
}

function helpRenderRecipes(list, q) {
    let recipes = DATA.recipes;
    if (q) recipes = recipes.filter(r => r.output.item.toLowerCase().includes(q) || (r.inputs||[]).some(i=>i.item.toLowerCase().includes(q)));
    document.getElementById('help-count').textContent = recipes.length + ' recipes';
    list.innerHTML = recipes.map(r => {
      const stats = r.output.stats || {};
      const statMd = Object.entries(stats).length
        ? '\n- Stats: ' + Object.entries(stats).map(([k,v])=>`${k}: ${v}`).join(', ') : '';
      const inputs = (r.inputs||[]).map(i=>`${i.quantity}× ${i.item}`).join(', ') || 'none';
      const md = `### ${r.output.item}${r._faction?' ['+r._faction+']':''}\n- Process: ${r.process||'manufacture'} | Category: ${r.output.category||'?'} | Output: ${r.output.quantity||1}/batch\n- Inputs: ${inputs}${statMd}\n> ✏️ Correction: `;
      const statRows = Object.entries(stats).map(([k,v]) => `<span class="help-stat"><b class="help-stat-key">${esc(k)}</b> <b class="stat-val">${v>0?'+':''}${v}</b></span>`).join('');
      return `<div class="help-recipe ${r.process||'manufacture'}">
        <div class="help-recipe-head">
          <span class="help-icon">${iconFor(r.output.item)}</span>
          <span class="help-name">${esc(r.output.item)}</span>
          ${r._faction?`<span class="help-faction">${esc(r._faction)}</span>`:''}
          <span class="help-meta">${r.process||'manufacture'} · ${esc(r.output.category||'?')} · ${r.output.quantity||1}/batch</span>
          <button class="help-copy-btn ghost" data-help-copy="${encodeURIComponent(r.output.item)}">Copy</button>
        </div>
        ${statRows ? `<div class="help-stats">${statRows}</div>` : ''}
        <pre class="help-md">${esc(md)}</pre>
      </div>`;
    }).join('');
    list.querySelectorAll('[data-help-copy]').forEach(b => {
      b.addEventListener('click', () => helpCopyRecipe(decodeURIComponent(b.dataset.helpCopy)));
    });
  }

function helpRenderMining(list, q) {
  let sites = DATA.mining_sites;
  if (q) sites = sites.filter(s => s.location.toLowerCase().includes(q) || s.yields.some(y=>y.toLowerCase().includes(q)));
  document.getElementById('help-count').textContent = sites.length + ' mining sites';
  list.innerHTML = sites.map(s => {
    const md = `### ${s.location}\n- Yields: ${s.yields.join(', ')}\n> ✏️ Correction: `;
    return `<div class="help-recipe">
      <div class="help-recipe-head">
        <span class="help-name">${esc(s.location)}</span>
        <span class="help-meta">${s.yields.length} yields</span>
        <button class="help-copy-btn ghost" data-help-copy="${encodeURIComponent(s.location)}">Copy</button>
      </div>
      <pre class="help-md">${esc(md)}</pre>
      <div class="help-detail"><b>Yields:</b> ${s.yields.map(y=>esc(y)).join(', ')}</div>
    </div>`;
  }).join('');
  list.querySelectorAll('[data-help-copy]').forEach(b => {
    b.addEventListener('click', () => helpCopyMining(decodeURIComponent(b.dataset.helpCopy)));
  });
}

function helpRenderItems(list, q) {
  let items = [...ALL_ITEMS].sort();
  if (q) items = items.filter(i => i.toLowerCase().includes(q));
  document.getElementById('help-count').textContent = items.length + ' items';
  list.innerHTML = items.map(i => {
    const md = `- ${i}\n> ✏️ Correction: `;
    return `<div class="help-recipe">
      <div class="help-recipe-head">
        <span class="help-icon">${iconFor(i)}</span>
        <span class="help-name">${esc(i)}</span>
        <button class="help-copy-btn ghost" data-help-copy="${encodeURIComponent(i)}">Copy</button>
      </div>
      <pre class="help-md">${esc(md)}</pre>
    </div>`;
  }).join('');
  list.querySelectorAll('[data-help-copy]').forEach(b => {
    b.addEventListener('click', () => helpCopyItem(decodeURIComponent(b.dataset.helpCopy)));
  });
}

function helpCopyRecipe(name) {
  const r = DATA.recipes.find(r => r.output.item === name);
  if (!r) return;
  const lines = [`### ${r.output.item}${r._faction?' ['+r._faction+']':''}`];
  lines.push(`- Process: ${r.process||'manufacture'} | Category: ${r.output.category||'?'} | Output: ${r.output.quantity||1}/batch`);
  lines.push(`- Inputs: ${(r.inputs||[]).map(i=>`${i.quantity}× ${i.item}`).join(', ') || 'none'}`);
  if (r.output.stats && Object.keys(r.output.stats).length) lines.push(`- Stats: ${Object.entries(r.output.stats).map(([k,v])=>`${k}: ${v}`).join(', ')}`);
  lines.push('\n> ✏️ Correction: ');
  navigator.clipboard.writeText(lines.join('\n')).then(() => toast('Copied! Send to John Snow.'));
}
function helpCopyMining(loc) {
  const s = DATA.mining_sites.find(s => s.location === loc);
  if (!s) return;
  navigator.clipboard.writeText(`### ${s.location}\n- Yields: ${s.yields.join(', ')}\n\n> ✏️ Correction: `).then(() => toast('Copied!'));
}
function helpCopyItem(name) {
  navigator.clipboard.writeText(`- ${name}\n> ✏️ Correction: `).then(() => toast('Copied!'));
}

function helpCopyAll() {
  const sec = document.getElementById('help-section').value;
  const q = (document.getElementById('help-search').value || '').toLowerCase();
  let text = '';
  if (sec === 'recipes') {
    let recipes = DATA.recipes;
    if (q) recipes = recipes.filter(r => r.output.item.toLowerCase().includes(q));
    text = recipes.map(r => {
      const l = [`### ${r.output.item}${r._faction?' ['+r._faction+']':''}`];
      l.push(`- Process: ${r.process||'manufacture'} | Category: ${r.output.category||'?'} | Output: ${r.output.quantity||1}/batch`);
      l.push(`- Inputs: ${(r.inputs||[]).map(i=>`${i.quantity}× ${i.item}`).join(', ') || 'none'}`);
      if (r.output.stats && Object.keys(r.output.stats).length) l.push(`- Stats: ${Object.entries(r.output.stats).map(([k,v])=>`${k}: ${v}`).join(', ')}`);
      l.push('\n> ✏️ Correction: ');
      return l.join('\n');
    }).join('\n\n');
  } else if (sec === 'mining') {
    let sites = DATA.mining_sites;
    if (q) sites = sites.filter(s => s.location.toLowerCase().includes(q));
    text = sites.map(s => `### ${s.location}\n- Yields: ${s.yields.join(', ')}\n\n> ✏️ Correction: `).join('\n\n');
  } else {
    let items = [...ALL_ITEMS].sort();
    if (q) items = items.filter(i => i.toLowerCase().includes(q));
    text = items.map(i => `- ${i}`).join('\n');
  }
  navigator.clipboard.writeText(text).then(() => toast('Copied! Send to John Snow.'));
}
