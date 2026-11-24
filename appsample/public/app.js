/* global chronicleIcons, chronicleMarkdown */
'use strict';
const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const icon = (name, className = '') => chronicleIcons.svg(name, className);
const icons = { overview: 'panels-top-left', prompt: 'message-square', response: 'sparkles', reasoning: 'brain', tool: 'terminal', edit: 'file-diff', event: 'activity', model: 'cpu', group: 'folder', context: 'paperclip', file: 'file-code-2' };
const state = {
  library: [], session: null, nodes: new Map(), parents: new Map(), expanded: new Set(), selected: null,
  filter: 'all', query: '', matches: new Set(), tab: 'readable', detail: null, cache: new Map(), visible: [], searchSequence: 0, loadSequence: 0,
  mode: 'library', view: 'library', libraryFilter: '', collapsedWorkspaces: new Set(), indexing: null, emptySessions: 0,
  workspace: null, locations: [], scan: null,
  tips: localStorage.getItem('chronicle-tips') !== 'off',
  results: null, highlight: null, globalSequence: 0,
  summaryConfig: null, activeSummaryJob: null, sessionSummaries: new Map(), savedSummary: null,
  sortBy: localStorage.getItem('chronicle-sort') || 'date-desc',
  defaultPaths: { vscodeStorage: '', agentSessions: '' }
};
let toastTimer;
let searchTimer;
let summaryPollTimer;
let summaryViewSequence = 0;
let pendingSummaryTarget = null;
let recordSequence = 0;
const records = new Map();
let storyVersion = 0;
const storyObservers = new Set();
function stopStory() {
  storyVersion++;
  for (const observer of storyObservers) observer.disconnect();
  storyObservers.clear();
}
const humanize = (value) => value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').replace(/^./, (char) => char.toUpperCase());
const modelName = (value) => (value || 'Not recorded').replace(/^copilot\//, '');
const number = (value) => new Intl.NumberFormat().format(value || 0);
const textOf = (value) => typeof value === 'string' ? value : Array.isArray(value) ? value.map(textOf).join('') : value ? textOf(value.value ?? value.text ?? value.content ?? '') : '';
function date(value, options = {}) {
  if (!value) return 'Time not recorded';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Time not recorded' : parsed.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', ...options });
}
function duration(value) {
  if (value === undefined || value === null) return 'Not recorded';
  return value < 1000 ? `${value} ms` : value < 60000 ? `${(value / 1000).toFixed(1)} s` : `${(value / 60000).toFixed(1)} min`;
}
function refreshIcons(root = document) { chronicleIcons.createIcons({ root, attrs: { 'aria-hidden': 'true' } }); }
function toast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4000);
}
async function api(url, options) {
  const response = await fetch(url, options);
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || `Request failed (${response.status})`);
  return value;
}
function codeBlock(text, language = '', label, copy = true) {
  text = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
  let content = escapeHtml(text);
  if (language && chronicleMarkdown.supportsLanguage(language) && text.length < 100000) {
    content = chronicleMarkdown.highlightCode(text, language);
  }
  return `<div class="code-block"><div class="code-top"><span>${escapeHtml(label || language || 'plain text')}</span>${copy ? `<button class="copy-code" data-copy-code>${icon('copy')} Copy</button>` : ''}</div><pre><code class="hljs">${content}</code></pre></div>`;
}
function markdown(text) {
  const rendered = chronicleMarkdown.parseMarkdown(text || '', {
    renderCodeBlock: (content, lang) => codeBlock(content, (lang || '').split(/\s+/)[0], undefined, false)
  });
  // Persisted HTML is untrusted, even when VS Code marked it as trusted.
  const html = chronicleMarkdown.sanitizeHtml(rendered);
  const template = document.createElement('template');
  template.innerHTML = html;
  for (const link of template.content.querySelectorAll('a')) {
    const href = link.getAttribute('href') || '';
    if (/^https?:\/\//i.test(href)) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
    else { link.removeAttribute('href'); link.classList.add('disabled-link'); link.title = `${href} (recorded reference; local files are not opened)`; }
  }
  for (const image of template.content.querySelectorAll('img')) {
    const source = image.getAttribute('src') || '';
    if (!/^data:image\/(png|jpeg|gif|webp);base64,/i.test(source)) {
      const marker = document.createElement('span');
      marker.className = 'badge';
      marker.textContent = `Image reference: ${image.alt || source} (not loaded)`;
      image.replaceWith(marker);
    }
  }
  // Code blocks get trusted copy buttons only after sanitizing recorded content.
  for (const block of template.content.querySelectorAll('.code-block .code-top')) {
    const button = document.createElement('button');
    button.className = 'copy-code';
    button.dataset.copyCode = '';
    button.innerHTML = `${icon('copy')} Copy`;
    block.append(button);
  }
  return `<div class="prose">${template.innerHTML}</div>`;
}
function badge(text, name, green = false) { return `<span class="badge${green ? ' green' : ''}">${name ? icon(name) : ''}${escapeHtml(text)}</span>`; }
function recordSummary(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `${number(value.length)} ${value.length === 1 ? 'item' : 'items'}`;
  if (typeof value === 'object') return `${Object.keys(value).length} fields`;
  return String(value);
}
function renderRecord(value) {
  if (value === null || typeof value !== 'object') return `<div class="record-value">${escapeHtml(value === null ? 'null' : value)}</div>`;
  const entries = Array.isArray(value) ? value.map((item, index) => [String(index + 1), item]) : Object.entries(value);
  if (!entries.length) return '<span class="muted">No recorded values.</span>';
  return `<div class="record-grid">${entries.map(([key, child]) => {
    if (child !== null && typeof child === 'object') {
      const id = String(recordSequence++);
      records.set(id, child);
      return `<details data-record="${id}"><summary>${escapeHtml(humanize(key))} <span class="muted">/ ${recordSummary(child)}</span></summary><div></div></details>`;
    }
    return `<div class="record-leaf"><div class="record-key">${escapeHtml(humanize(key))}</div><div class="record-value">${escapeHtml(child === null ? 'null' : child)}</div></div>`;
  }).join('')}</div>`;
}
function warningsHtml(warnings) {
  if (!warnings.length) return '';
  return `<details class="warning-box"><summary>${icon('triangle-alert')} ${number(warnings.length)} source ${warnings.length === 1 ? 'warning' : 'warnings'} · Some data could not be reconstructed</summary>${warnings.map((item) => `<p>${escapeHtml(item)}</p>`).join('')}</details>`;
}

const bytes = (value) => value >= 1e9 ? `${(value / 1e9).toFixed(1)} GB` : value >= 1e6 ? `${(value / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round((value || 0) / 1e3))} KB`;
const kindLabels = { prompt: 'Prompt', response: 'Response', reasoning: 'Reasoning', tool: 'Tool call', edit: 'File edit', file: 'File' };
let libraryTimer;
let warningsShown = false;
function sessionTimestamp(session) {
  return session.lastAt || session.createdAt || 0;
}
function compareSessionNames(a, b) {
  return String(a.title || '').localeCompare(String(b.title || ''), undefined, { numeric: true, sensitivity: 'base' });
}
function sortSessions(list, sortBy = state.sortBy) {
  const copy = [...list];
  copy.sort((a, b) => {
    if (sortBy === 'date-asc') return sessionTimestamp(a) - sessionTimestamp(b) || compareSessionNames(a, b);
    if (sortBy === 'name-asc') return compareSessionNames(a, b) || sessionTimestamp(b) - sessionTimestamp(a);
    if (sortBy === 'name-desc') return compareSessionNames(b, a) || sessionTimestamp(b) - sessionTimestamp(a);
    return sessionTimestamp(b) - sessionTimestamp(a) || compareSessionNames(a, b);
  });
  return copy;
}
function setSortOrder(nextSort) {
  if (!['date-desc', 'date-asc', 'name-asc', 'name-desc'].includes(nextSort)) return;
  state.sortBy = nextSort;
  localStorage.setItem('chronicle-sort', nextSort);
  if ($('#sidebar-sort')) $('#sidebar-sort').value = nextSort;
  if (state.mode === 'library') renderLibraryTree();
  if (state.view === 'library') renderLibraryPage(false);
}
async function refreshLibrary() {
  const result = await api('/api/sessions');
  const completedScan = state.scan?.running && !result.scan?.running;
  state.scan = result.scan;
  renderScanStatus();
  state.locations = result.locations || [];
  if (result.defaultPaths) state.defaultPaths = result.defaultPaths;
  state.library = sortSessions(result.sessions);
  state.indexing = result.indexing;
  state.emptySessions = result.empty || 0;
  if (result.warnings.length && !warningsShown) { warningsShown = true; toast(result.warnings.join(' · ')); }
  const { done, total, active, current } = result.indexing;
  $('#index-progress').hidden = !active;
  if (active) {
    $('#index-bar-fill').style.width = `${total ? Math.round((done / total) * 100) : 0}%`;
    $('#index-label').textContent = `Indexing ${number(done)} / ${number(total)} · ${current || ''}`;
  }
  if (state.mode === 'library') $('#session-count').textContent = `${number(state.library.length)} ${state.library.length === 1 ? 'session' : 'sessions'}${state.emptySessions ? ` · ${number(state.emptySessions)} empty hidden` : ''}`;
  clearTimeout(libraryTimer);
  if (active || state.scan?.running) libraryTimer = setTimeout(() => refreshLibrary().then((next) => {
    if (next.completedScan || state.scan?.running) return;
    if (state.mode === 'library') {
      renderLibraryTree();
      if (state.view === 'library') renderLibraryPage(false);
      else if (state.view === 'workspace') {
        const member = state.library.find((session) => session.workspaceId === state.workspace.id) ||
          state.library.find((session) => state.workspace.sessions.some((old) => old.id === session.id));
        if (member) loadWorkspace(member.workspaceId, false);
        else showLibrary();
      }
    }
  }).catch((error) => {
    if (state.scan) state.scan.running = false;
    toast(`Could not refresh local history: ${error.message}`);
    renderScanStatus(error.message);
  }), 750);
  if (completedScan) {
    toast(state.scan.errors.length ? `Scan finished with ${state.scan.errors.length} issue${state.scan.errors.length === 1 ? '' : 's'}. Open scan status for details.` : `Scan finished: ${state.scan.added} added, ${state.scan.removed} removed, ${state.scan.reindexed} reindexed.`);
    if (state.mode === 'session') {
      const id = state.session.id;
      if (state.library.some((session) => session.id === id)) await loadSession(id);
      else showLibrary();
    } else if (state.view === 'workspace') {
      if (state.library.some((session) => session.workspaceId === state.workspace.id)) await loadWorkspace(state.workspace.id, false);
      else showLibrary();
    } else showLibrary();
  }
  return { ...result, completedScan };
}
function renderScanStatus(error) {
  const scan = state.scan;
  $('#scan-button').disabled = !!scan?.running;
  $('#scan-button-label').textContent = scan?.running ? 'Scanning...' : 'Scan for Updates';
  $('#scan-status').textContent = error ? 'Refresh failed' : scan?.running ? 'Reading saved locations' : scan?.errors.length ? `Scan issues: ${scan.errors.length}` : scan?.completedAt ? `Scanned ${date(scan.completedAt)}` : 'Scan status';
  $('#scan-status').classList.toggle('has-errors', !!error || !!scan?.errors.length);
  $('#scan-result').textContent = error || (scan?.running ? 'Scan in progress. You can continue browsing.' : scan?.completedAt ? `Finished ${date(scan.completedAt)}. ${scan.added} added, ${scan.removed} removed, ${scan.reindexed} reindexed. Unchanged cached sessions are reused.` : 'No manual scan has completed since the app started.');
  $('#scan-result-errors').textContent = (scan?.errors || []).join('\n\n');
}
async function loadLibrary(preferred) {
  await refreshLibrary();
  if (preferred) { await loadSession(preferred); return; }
  showLibrary();
}
function setMode(mode) {
  state.mode = mode;
  $('#session-count').textContent = mode === 'library' ? `${number(state.library.length)} ${state.library.length === 1 ? 'session' : 'sessions'}${state.emptySessions ? ` · ${number(state.emptySessions)} empty hidden` : ''}` : `${number(state.session.stats.prompts)} prompts · ${number(state.session.stats.tools)} tool calls`;
  document.body.classList.toggle('library-mode', mode === 'library');
  $('#back-to-library').hidden = mode === 'library';
  $('#sidebar-eyebrow').textContent = mode === 'library' ? 'LIBRARY' : 'SESSION';
  $('#tree-heading-label').textContent = mode === 'library' ? 'SESSIONS' : 'EXPLORER';
  $('#search').placeholder = mode === 'library' ? 'Filter sessions...' : 'Search the entire session...';
  $('#search').value = mode === 'library' ? state.libraryFilter || '' : '';
  $('#search-scope').querySelector('[value="session"]').disabled = mode === 'library';
  if (mode === 'library') $('#search-scope').value = 'all';
  $('#export-button').title = mode === 'session' ? 'Export reconstructed session JSON' : 'Export workspace usage report';
  $('#export-button').setAttribute('aria-label', mode === 'session' ? 'Export session' : 'Export workspace usage report');
}
function showLibrary() {
  stopStory();
  state.loadSequence++;
  state.workspace = null;
  setMode('library');
  $('#sidebar-title').textContent = 'Your conversations';
  $('#sidebar-title').title = '';
  $('#bottom-source').textContent = 'Session library';
  $('#bottom-source').title = '';
  renderLibraryTree();
  if (!state.library.length) { renderEmpty(); return; }
  renderLibraryPage();
}
function workspaces(list = state.library) {
  const groups = new Map();
  for (const session of sortSessions(list)) {
    const name = session.workspaceName || 'Other sessions';
    const id = session.workspaceId;
    if (!groups.has(id)) groups.set(id, { id, name, path: session.workspacePath, sessions: [] });
    const group = groups.get(id);
    if (!group.path && session.workspacePath) group.path = session.workspacePath;
    group.sessions.push(session);
  }
  const ordered = [...groups.values()];
  ordered.sort((a, b) => {
    if (state.sortBy === 'name-asc') return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    if (state.sortBy === 'name-desc') return b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' });
    const timeA = sessionTimestamp(a.sessions[0] || {});
    const timeB = sessionTimestamp(b.sessions[0] || {});
    return state.sortBy === 'date-asc' ? timeA - timeB : timeB - timeA;
  });
  return ordered;
}
function filteredLibrary() {
  const filter = (state.libraryFilter || '').toLowerCase();
  const base = filter ? state.library.filter((session) => `${session.title} ${session.firstPrompt || ''} ${session.workspaceName || ''} ${session.clientName || ''}`.toLowerCase().includes(filter)) : state.library;
  return sortSessions(base);
}
function sessionStatus(session) {
  if (session.status === 'error') return `<span class="session-flag error" title="${escapeHtml(session.error)}">${icon('triangle-alert')} Not indexed</span>`;
  if (session.status === 'pending') return `<span class="session-flag">${icon('loader')} Indexing</span>`;
  return '';
}
function sessionOriginBadge(session) {
  return session.sessionFormat === 'agent-host' ? '<span class="origin-tag agent">Agent</span>' : '';
}
function renderLibraryTree() {
  if (state.mode !== 'library') return;
  if ($('#sidebar-sort')) $('#sidebar-sort').value = state.sortBy;
  $('.format-tag').textContent = 'LOCAL';
  const list = filteredLibrary();
  const groups = workspaces(list);
  state.visible = [];
  $('#tree-scroll').innerHTML = groups.map((group) => {
    const open = !state.collapsedWorkspaces.has(group.id) || !!state.libraryFilter;
    return `<div class="workspace-group${open ? ' open' : ''}"><div class="workspace-heading"><button class="icon-button" data-workspace-toggle="${group.id}" aria-expanded="${open}" aria-label="${open ? 'Collapse' : 'Expand'} ${escapeHtml(group.name)}">${icon(open ? 'chevron-down' : 'chevron-right')}</button><button class="workspace-row${state.view === 'workspace' && state.workspace?.id === group.id ? ' current' : ''}" data-workspace="${group.id}" title="${escapeHtml(group.path || group.name)}">${icon('folder-git-2', 'node-icon')}<span class="tree-title">${escapeHtml(group.name)}</span><span class="node-count">${group.sessions.length}</span></button></div>
      ${open ? `<div class="workspace-sessions">${group.sessions.map((session) => `<button class="session-row${state.session?.id === session.id ? ' current' : ''}" data-session="${session.id}" title="${escapeHtml(session.firstPrompt || session.title)}"><span class="session-row-title">${escapeHtml(session.title)}</span><span class="session-row-meta">${sessionOriginBadge(session)}${session.lastAt || session.createdAt ? date(session.lastAt || session.createdAt, { year: 'numeric', hour: undefined, minute: undefined }) : ''}${session.stats ? ` · ${number(session.stats.prompts)} ${session.stats.prompts === 1 ? 'prompt' : 'prompts'}` : ''} · ${bytes(session.size)}</span>${sessionStatus(session)}</button>`).join('')}</div>` : ''}</div>`;
  }).join('') || `<div class="empty-state">${state.library.length ? 'No sessions match this filter.' : 'No sessions yet.'}</div>`;
  $('#tree-status').textContent = `${number(list.length)} of ${number(state.library.length)} sessions`;
  refreshIcons($('#tree-scroll'));
}
function renderLibraryPage(resetScroll = true) {
  state.view = 'library';
  state.selected = null;
  records.clear();
  $('.rail-button.active')?.classList.remove('active');
  $('#library-button').classList.add('active');
  $('#breadcrumb').innerHTML = 'Library <span>/</span> All sessions';
  const list = state.library;
  const totals = list.reduce((sum, session) => {
    sum.prompts += session.stats?.prompts || 0; sum.tools += session.stats?.tools || 0; sum.size += session.size || 0;
    return sum;
  }, { prompts: 0, tools: 0, size: 0 });
  const filtered = filteredLibrary();
  const groups = workspaces(filtered);
  const { done, total, active } = state.indexing || {};
  const isDateSort = state.sortBy.startsWith('date-');
  const isNameSort = state.sortBy.startsWith('name-');
  const scroll = $('#reader').scrollTop;
  $('#reader').innerHTML = `<article class="reader-inner library-page">
    <div class="hero"><h1>Session library</h1><p>${number(list.length)} sessions across ${number(workspaces().length)} workspaces.</p></div>
    ${active ? `<div class="index-card"><div class="index-card-top">${icon('scan-search')}<span>Building the search index · ${number(done)} of ${number(total)} sessions</span><span class="muted">${escapeHtml(state.indexing.current || '')}</span></div><div class="index-bar large"><span style="width:${total ? Math.round((done / total) * 100) : 0}%"></span></div><p class="muted">Sessions open immediately; search covers each session as soon as it is indexed. The index is cached, so this only happens once per change.</p></div>` : ''}
    <div class="metrics">${metric('Sessions', list.length, 'messages-square', `${number(state.emptySessions)} empty hidden`)}${metric('Workspaces', workspaces().length, 'folder-git-2', 'Grouped by folder')}${metric('Prompts', totals.prompts, 'message-square', 'Across all sessions')}${metric('Tool calls', totals.tools, 'terminal', `${bytes(totals.size)} of history`)}</div>
    <div class="library-toolbar" role="region" aria-label="Sort sessions">
      <span class="library-toolbar-summary">${number(filtered.length)} ${filtered.length === 1 ? 'session' : 'sessions'} shown</span>
      <div class="sort-controls">
        <span class="sort-label">${icon('arrow-up-down')} Sort by</span>
        <button type="button" class="sort-pill${isDateSort ? ' active' : ''}" data-sort-toggle="date">${icon('calendar-days')} Date ${state.sortBy === 'date-asc' ? '↑' : '↓'}</button>
        <button type="button" class="sort-pill${isNameSort ? ' active' : ''}" data-sort-toggle="name">${icon('arrow-down-a-z')} Name ${state.sortBy === 'name-desc' ? 'Z→A' : 'A→Z'}</button>
        <select id="library-page-sort" aria-label="Sort sessions order">
          <option value="date-desc"${state.sortBy === 'date-desc' ? ' selected' : ''}>Date (Newest first)</option>
          <option value="date-asc"${state.sortBy === 'date-asc' ? ' selected' : ''}>Date (Oldest first)</option>
          <option value="name-asc"${state.sortBy === 'name-asc' ? ' selected' : ''}>Name (A → Z)</option>
          <option value="name-desc"${state.sortBy === 'name-desc' ? ' selected' : ''}>Name (Z → A)</option>
        </select>
      </div>
    </div>
    ${groups.map((group) => `<section class="library-group"><div class="section-title"><h2><button class="section-link" data-workspace="${group.id}">${icon('folder-git-2')} ${escapeHtml(group.name)} <span>${group.sessions.length}</span></button></h2><span class="muted library-path">${escapeHtml(group.path || '')}</span></div><div class="session-cards">
      ${group.sessions.map((session) => `<button class="session-card${session.status === 'error' ? ' failed' : ''}" data-session="${session.id}"><div class="preview-top"><span class="prompt-chip">${session.stats ? `${number(session.stats.prompts)} ${session.stats.prompts === 1 ? 'PROMPT' : 'PROMPTS'}` : 'INDEXING'}</span>${sessionOriginBadge(session)}<time>${date(session.lastAt || session.createdAt)}</time></div><div class="session-card-title">${escapeHtml(session.title)}</div><div class="preview-text">${escapeHtml(session.firstPrompt || '')}</div><div class="preview-bottom">${session.stats ? `<span>${number(session.stats.tools)} tool calls</span><span>${escapeHtml(modelName(session.modelTimeline?.at(-1)?.to))}</span>` : ''}<span>${bytes(session.size)}</span>${sessionStatus(session)}</div></button>`).join('')}
    </div></section>`).join('') || '<div class="empty-state">No sessions match this filter.</div>'}
  </article>`;
  $('#reader').scrollTop = resetScroll ? 0 : scroll;
  refreshIcons($('#reader'));
}
async function loadWorkspace(id, resetScroll = true) {
  stopStory();
  const sequence = ++state.loadSequence;
  const scroll = $('#reader').scrollTop;
  try {
    const workspace = await api(`/api/workspaces/${encodeURIComponent(id)}`);
    if (sequence !== state.loadSequence) return;
    state.workspace = workspace;
    state.view = 'workspace';
    state.selected = null;
    state.detail = null;
    records.clear();
    setMode('library');
    $('#sidebar-title').textContent = 'Workspaces and sessions';
    $('#sidebar-title').title = workspace.workspacePath || workspace.title;
    $('#bottom-source').textContent = workspace.workspacePath || workspace.title;
    $('#bottom-source').title = workspace.workspacePath || workspace.title;
    $('#breadcrumb').innerHTML = `Library <span>/</span> ${escapeHtml(workspace.title)}`;
    $('.rail-button.active')?.classList.remove('active');
    $('#home-button').classList.add('active');
    const usage = workspace.usage;
    const max = Math.max(0, ...workspace.sessions.map((session) => session.usage?.credits || 0));
    const allModels = [...new Set([...workspace.models, ...usage.modelCredits.map((item) => item.model)])];
    const color = (model) => `hsl(${(allModels.indexOf(model) * 67 + 90) % 360},55%,55%)`;
    $('#reader').innerHTML = `<article class="reader-inner workspace-page">
      <div class="session-eyebrow">WORKSPACE OVERVIEW</div><div class="hero"><h1>${escapeHtml(workspace.title)}</h1></div>
      <div class="source-path">${escapeHtml(workspace.workspacePath || 'Workspace path not recorded')}</div>
      <div class="session-meta"><button class="button" data-library>All workspaces</button>${badge(`${workspace.sessionCount} sessions`, 'messages-square')}${badge(`${workspace.stats.models} models`, 'cpu')}
      <button class="button summary-action-button" data-create-workspace-summary ${workspace.pendingCount || workspace.failedCount ? 'disabled' : ''}>${icon('file-text')} Create workspace summary</button>
      ${savedSummaryButtonHtml('workspace', workspace.id, workspace.title)}
      <a class="button" href="/api/workspaces/${workspace.id}/export" download>Download usage report</a>${sessionSummaryLinkHtml(`workspace:${workspace.id}`)}</div>
      <p class="muted">${workspace.indexedCount}/${workspace.sessionCount} sessions indexed${workspace.pendingCount ? ` · ${workspace.pendingCount} pending` : ''}${workspace.failedCount ? ` · ${workspace.failedCount} failed` : ''}. Statistics include indexed sessions only. Summaries send all sessions in this group to your configured Foundry agent.</p>
      ${warningsHtml(workspace.warnings)}
      <div class="metrics">${metric('User prompts', workspace.stats.prompts, 'message-square', 'All indexed sessions')}${metric('Tool calls', workspace.stats.tools, 'terminal', 'All indexed sessions')}${metric('File operations', workspace.stats.edits, 'file-diff', 'Recorded operations')}${metric('Reasoning blocks', workspace.stats.reasoning, 'brain', 'Including unavailable text')}</div>
      <section class="credit-card"><div class="section-title"><h2>Workspace usage summary</h2>${badge(usage.partial ? 'Incomplete usage' : 'Recorded usage', 'info')}</div>
      ${keyValues([
        ['Recorded priced AI credits', creditNumber(usage.credits)], ['Estimated USD cost', usage.usd === null ? 'Unavailable' : `$${creditNumber(usage.usd)}`],
        ['Priced turns', `${usage.pricedTurns} / ${workspace.stats.prompts}`], ['Recorded usage entries', number(usage.callCount)],
        ...[['input', 'Input tokens'], ['cached', 'Cached input tokens'], ['cacheWrite', 'Cache-write tokens'], ['output', 'Output tokens'], ['reasoning', 'Reasoning tokens (part of output)']].map(([key, label]) => [label, usage.tokens[key] === null ? 'Not recorded' : number(usage.tokens[key])])
      ])}
      ${reportedConsumptionHtml(usage.reported)}
      <h3>Models across sessions</h3><div class="credit-legend">${allModels.map((model) => `<span><i style="background:${color(model)}"></i>${escapeHtml(modelName(model))}</span>`).join('') || 'No model metadata recorded.'}</div>
      ${usage.modelCredits.length ? usageTable(usage.modelCredits.map((item) => ({ ...item, label: `${item.callCount} usage entries`, tier: 'Mixed / see sessions' }))) : '<p>No per-call or turn-level usage recorded.</p>'}
      ${usage.aggregate ? `<details class="story-metadata"><summary>Separate session aggregate snapshots · ${usage.aggregateSessions} sessions</summary><p>${creditNumber(usage.aggregate.credits)} estimated AI credits / ${usage.aggregate.usd === null ? 'Unavailable USD' : `$${creditNumber(usage.aggregate.usd)}`}${usage.aggregate.partial ? ' (incomplete)' : ''}. Latest saved snapshot per session. Overlaps turn usage and is NOT added to the total above; per-call context tiers may be unavailable.</p>${usageTable(usage.aggregate.modelCredits.map((item) => ({ ...item, label: 'Session snapshots', tier: 'Aggregate' })))}</details>` : ''}
      <p class="footnote">Reference-price estimates, not invoices. Missing usage is not zero. Reasoning is included in output. <a href="${escapeHtml(usage.pricing.source)}" target="_blank" rel="noopener noreferrer">GitHub pricing</a> checked ${escapeHtml(usage.pricing.checkedAt)}. Scan for Updates refreshes local history, not this pricing snapshot.</p></section>
      <section><div class="section-title"><h2>Sessions <span>${workspace.sessionCount}</span></h2><span class="muted">Chronological · select to drill down</span></div>
      <div class="credit-chart"><div class="workspace-session-heading"><span>Session / models</span><span>Prompts / tools</span><span>AI credits / USD</span></div>
      ${workspace.sessions.map((session) => {
        const cost = session.usage;
        const label = `${session.title}: ${creditNumber(cost?.credits)} AI credits`;
        return `<button class="workspace-session-row" data-session="${session.id}" title="${escapeHtml(label)}"><span><strong>${escapeHtml(session.title)}</strong><small>${date(session.lastAt || session.createdAt)} · ${(cost?.modelCredits?.map((item) => modelName(item.model)) || session.modelTimeline?.map((item) => modelName(item.to)) || []).map(escapeHtml).join(', ') || 'Model not recorded'}</small><span class="credit-bar-track" aria-hidden="true">${cost?.credits !== null && cost?.credits !== undefined ? cost.modelCredits.filter((item) => item.credits !== null).map((item) => `<span class="credit-bar-segment" style="width:${max ? item.credits / max * 100 : 0}%;background:${color(item.model)}"></span>`).join('') : '<span class="credit-unavailable">Usage unavailable</span>'}</span>${sessionStatus(session)}</span><span>${session.stats ? `${number(session.stats.prompts)} / ${number(session.stats.tools)}` : 'Not indexed'}</span><span>${creditNumber(cost?.credits)}${cost?.partial ? ' *' : ''}<small>${cost?.usd === null || cost?.usd === undefined ? 'Unavailable USD' : `$${creditNumber(cost.usd)}`}</small></span></button>`;
      }).join('')}</div></section></article>`;
    renderLibraryTree();
    refreshIcons($('#reader'));
    $('#reader').scrollTop = resetScroll ? 0 : scroll;
    refreshSavedSummaryButtons();
  } catch (error) {
    if (sequence !== state.loadSequence) return;
    toast(error.message);
    if (resetScroll) $('#reader').innerHTML = `<div class="empty-state">${escapeHtml(error.message)}<button class="button" data-library>All workspaces</button></div>`;
  }
}
function enterSession() {
  state.view = 'session';
  $('.format-tag').textContent = state.session?.sessionFormat === 'agent-host' ? 'AGENT HOST' : 'VS CODE';
  if (state.mode === 'session') return;
  setMode('session');
  $('#sidebar-title').textContent = state.session.title;
  $('#bottom-source').textContent = state.session.file;
}
function renderEmpty() {
  state.view = 'library';
  $('#tree-scroll').innerHTML = '<div class="empty-state">No sessions found.</div>';
  $('#reader').innerHTML = `<div class="empty-state">${icon('folder-open')}<h2>No sessions found</h2><p>Add folders containing VS Code or Agent Host / CLI history.</p><div class="empty-actions"><button class="button primary" data-open>Scan locations</button></div></div>`;
  $('#tree-status').textContent = 'No sessions';
  refreshIcons();
}
async function loadSession(id, { render = true } = {}) {
  stopStory();
  const sequence = ++state.loadSequence;
  state.searchSequence++;
  clearTimeout(searchTimer);
  const entry = state.library.find((session) => session.id === id);
  $('#reader').innerHTML = `<div class="loading-state"><span class="spinner"></span> Reconstructing ${entry ? `“${escapeHtml(entry.title)}”` : 'the conversation'}${entry?.size > 50e6 ? ` · reading ${bytes(entry.size)}, this can take a few seconds` : ''}...</div>`;
  let session;
  try { session = await api(`/api/sessions/${id}`); }
  catch (error) {
    if (sequence === state.loadSequence) {
      $('#reader').innerHTML = `<div class="empty-state">${icon('triangle-alert')}<h2>This session could not be opened.</h2><p>${escapeHtml(error.message)}</p><button class="button" data-library>Back to library</button></div>`;
      refreshIcons($('#reader'));
    }
    return false;
  }
  if (sequence !== state.loadSequence) return false;
  state.session = session;
  if (state.workspace && !state.workspace.sessions.some((member) => member.id === id)) state.workspace = null;
  setMode('session');
  $('#back-to-library').innerHTML = `${icon('arrow-left')} ${state.workspace ? escapeHtml(state.workspace.title) : 'All sessions'}`;
  $('#sidebar-title').textContent = session.title;
  $('#sidebar-title').title = session.workspacePath || session.file;
  state.view = 'session';
  state.nodes.clear(); state.parents.clear(); state.expanded.clear(); state.cache.clear();
  state.query = ''; state.matches.clear(); state.filter = 'all'; state.detail = null;
  $('#search').value = '';
  document.querySelectorAll('.filter').forEach((button) => button.classList.toggle('active', button.dataset.filter === 'all'));
  localStorage.setItem('chronicle-session', id);
  function index(item, parent) {
    if (!state.nodes.has(item.id)) {
      state.nodes.set(item.id, item);
      if (parent) state.parents.set(item.id, parent.id);
      item.children.forEach((child) => index(child, item));
    }
  }
  index(session.overview);
  session.requests.forEach((request) => index(request));
  if (session.requests[0]) state.expanded.add(session.requests[0].id);
  state.selected = session.overview.id;
  $('#bottom-source').textContent = session.file;
  $('#bottom-source').title = session.file;
  $('#tree-status').textContent = `${number(state.nodes.size)} recorded items`;
  renderTree();
  if (render) renderOverview();
  return true;
}
function matchesKind(item) {
  return state.filter === 'all' || (state.filter === 'response' ? ['prompt', 'response'].includes(item.kind) : item.kind === state.filter);
}
function renderTree() {
  if (!state.session || state.mode !== 'session') return;
  const scroll = $('#tree-scroll').scrollTop;
  const searching = !!state.query || state.filter !== 'all';
  const visibility = new Map();
  function visible(item) {
    if (visibility.has(item.id)) return visibility.get(item.id);
    const self = matchesKind(item) && (!state.query || state.matches.has(item.id));
    const result = self || item.children.some(visible);
    visibility.set(item.id, result);
    return result;
  }
  state.visible = [];
  function branch(item, level) {
    if (searching && !visible(item)) return '';
    state.visible.push(item.id);
    const children = searching ? item.children.filter(visible) : item.children;
    const expanded = state.expanded.has(item.id) || searching;
    const selected = state.selected === item.id;
    const position = state.visible.length;
    return `<li class="tree-branch" role="none"><div role="treeitem" tabindex="${selected || (state.selected === state.session.overview.id && position === 1) ? '0' : '-1'}" aria-level="${level}" aria-selected="${selected}" ${children.length ? `aria-expanded="${expanded}"` : ''} class="tree-row${item.kind === 'prompt' ? ' prompt-row' : ''}${selected ? ' selected' : ''}${item.failed ? ' failed' : ''}" data-node="${item.id}" data-position="${position}" data-kind="${item.kind}" title="${escapeHtml(item.title)}">
      <button class="twisty${children.length ? '' : ' placeholder'}" tabindex="-1" data-toggle="${item.id}" aria-label="${expanded ? 'Collapse' : 'Expand'}">${icon(expanded ? 'chevron-down' : 'chevron-right')}</button>
      ${item.kind === 'prompt' ? `<span class="prompt-number">${String(item.index).padStart(2, '0')}</span>` : ''}${icon(icons[item.kind] || 'circle', 'node-icon')}<span class="tree-title">${escapeHtml(item.title)}</span>${item.hidden ? icon('eye-off', 'node-icon') : ''}${children.length ? `<span class="node-count">${children.length}</span>` : ''}</div>
      ${item.kind === 'prompt' && !searching ? `<div class="prompt-model">${escapeHtml(modelName(item.model))}</div>` : ''}
      ${children.length && expanded ? `<ul role="group" class="tree-branch tree-children">${children.map((child) => branch(child, level + 1)).join('')}</ul>` : ''}</li>`;
  }
  const overview = state.session.overview;
  const prompts = state.session.requests.map((request) => branch(request, 1)).join('');
  const overviewChildren = state.expanded.has(overview.id) || searching ? overview.children.map((child) => branch(child, 1)).join('') : '';
  $('#tree-scroll').innerHTML = `<button class="tree-overview${state.selected === overview.id ? ' active' : ''}" data-select="${overview.id}">${icon('panels-top-left')}Session overview<span class="overview-count">${state.session.stats.prompts} prompts</span><span class="twisty" data-toggle="${overview.id}" title="Show source records">${icon(state.expanded.has(overview.id) ? 'chevron-down' : 'chevron-right')}</span></button>
    ${overviewChildren ? `<ul class="tree-branch" role="tree" aria-label="Session source records">${overviewChildren}</ul>` : ''}
    <div class="tree-label"><span>CONVERSATION</span><span>${searching ? 'FILTERED' : 'CHRONOLOGICAL'}</span></div>
    <ul class="tree-branch" role="tree" aria-label="Conversation history">${prompts}</ul>${!prompts ? '<div class="empty-state">No matching conversation items.</div>' : ''}`;
  $('#tree-scroll').scrollTop = scroll;
  refreshIcons($('#tree-scroll'));
}
function metric(label, count, name, foot) {
  return `<div class="metric"><div class="metric-top">${label}${icon(name)}</div><div class="metric-value">${number(count)}</div><div class="metric-foot">${foot}</div></div>`;
}
function modelTimelineHtml() {
  return `<div class="model-card">${state.session.modelTimeline.map((item) => `<div class="model-item"><div class="model-name">${escapeHtml(modelName(item.to))}</div><div class="model-desc">${item.from ? 'Switched at' : 'Selected at'} prompt ${String(item.prompt).padStart(2, '0')} · ${date(item.timestamp, { hour: undefined, minute: undefined })}</div><div class="model-config">${Object.entries(item.configuration || {}).map(([key, value]) => `<span>${escapeHtml(humanize(key))}: ${escapeHtml(typeof value === 'object' ? JSON.stringify(value) : numberIfNeeded(value))}</span>`).join('')}</div></div>`).join('') || '<span class="muted">No model metadata was recorded.</span>'}</div>`;
}
function numberIfNeeded(value) { return typeof value === 'number' ? number(value) : String(value); }
function creditNumber(value) {
  if (value === null || value === undefined) return 'Unavailable';
  if (value > 0 && value < 0.000001) return '<0.000001';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(value);
}
function tipBubble(text) {
  return `<button type="button" class="tip-bubble" data-tip="${escapeHtml(text)}" aria-label="Explanation: ${escapeHtml(text)}">?</button>`;
}
function reportedConsumptionHtml(reported) {
  const units = (value) => value === null || value === undefined ? 'Unavailable' : new Intl.NumberFormat(undefined, { maximumFractionDigits: 9 }).format(value);
  const workspace = reported?.coveredSessions !== undefined;
  return `<section class="reported-consumption"><h3>Runtime-reported consumption ${tipBubble('The runtime saves cumulative nano-AIU checkpoints separately from token counts. These totals overlap estimates: never add the two. A checkpoint may predate the final activity, and cannot reconstruct per-turn consumption.')}</h3>
    ${keyValues([['Reported AI units', units(reported?.aiUnits)], ['Raw nano-AIU', reported?.nanoAiu === null || reported?.nanoAiu === undefined ? 'Not recorded' : number(reported.nanoAiu)],
      [workspace ? 'Session coverage' : 'Latest saved checkpoint', workspace ? `${reported.coveredSessions} / ${reported.totalSessions}${reported.partial ? ' (incomplete)' : ''}` : reported?.timestamp === null || reported?.timestamp === undefined ? 'Not recorded' : date(reported.timestamp)]])}
    <p class="muted">1 AI unit = 1,000,000,000 nano-AIU. Shown separately from estimated AI credits; no currency conversion or invoice reconciliation is assumed. Checkpoints may predate final activity and cannot reconstruct missing per-turn consumption.${workspace ? ' Latest checkpoint per covered session only; missing sessions are not zero.' : ''}</p>
    ${reported?.snapshots?.length ? `<details class="story-metadata"><summary>Saved consumption checkpoints (${reported.snapshots.length})</summary><div class="usage-table-scroll"><table class="usage-table"><thead><tr><th>Saved at</th><th>Event / source</th><th>Nano-AIU</th><th>AI units</th></tr></thead><tbody>${reported.snapshots.map((item) => `<tr><td>${escapeHtml(date(item.timestamp))}</td><td>${escapeHtml(item.type)}<small>${item.sources.map(escapeHtml).join(', ')}</small></td><td>${number(item.nanoAiu)}</td><td>${units(item.aiUnits)}</td></tr>`).join('')}</tbody></table></div><p>These are cumulative snapshots, not additional charges. Only the latest is used.</p></details>` : !workspace ? '<p>No valid runtime consumption checkpoint was saved. Token estimates remain available where counts were recorded.</p>' : ''}
    ${(reported?.warnings || []).map((warning) => `<p class="usage-warning">${escapeHtml(warning)}</p>`).join('')}</section>`;
}
function usageTable(calls) {
  return `<div class="usage-table-scroll"><table class="usage-table"><caption>Recorded model usage. Input includes cache; reasoning is part of output, not an extra charge.</caption><thead><tr><th>Model / activity</th><th>Input</th><th>Cached</th><th>Cache write</th><th>Output</th><th>Reasoning</th><th>AI credits</th></tr></thead><tbody>${calls.map((call) => `<tr><th scope="row">${escapeHtml(modelName(call.model))}<small>${escapeHtml(call.label || 'Model call')}${call.agent ? ` · Agent ${escapeHtml(call.agent)}` : ''} · ${escapeHtml(call.tier || 'Default')}</small></th>${['input', 'cached', 'cacheWrite', 'output', 'reasoning'].map((key) => `<td>${call.tokens[key] === null ? 'Not recorded' : number(call.tokens[key])}</td>`).join('')}<td>${escapeHtml(creditNumber(call.credits))}${call.partial ? ' *' : ''}</td></tr>${call.components ? `<tr class="usage-components"><td colspan="7">Credit components: ${Object.entries(call.components).map(([key, value]) => `${escapeHtml(humanize(key))} ${escapeHtml(creditNumber(value))}`).join(' + ')}${call.source ? ` · ${escapeHtml(call.source)}` : ''}</td></tr>` : ''}${call.notes?.length ? `<tr class="usage-notes"><td colspan="7">${call.notes.map(escapeHtml).join(' ')}</td></tr>` : ''}`).join('')}</tbody></table></div>`;
}
function tokenBubble(usage) {
  if (!usage) return '';
  const tokens = usage.tokens;
  const knownTokens = tokens.input !== null && tokens.output !== null ? `${number(tokens.input + tokens.output)} tokens` : 'Tokens unavailable';
  const calls = usage.calls || (usage.model ? [usage] : []);
  return `<details class="token-bubble"><summary>${icon('info')}${knownTokens} · ${escapeHtml(creditNumber(usage.credits))} AI credits${usage.partial ? ' *' : ''}</summary><div class="token-bubble-panel"><strong>Reference-price estimate${usage.partial ? ' · incomplete' : ''}</strong>${keyValues([
    ['Input tokens (including cache)', tokens.input === null ? 'Not recorded' : number(tokens.input)],
    ['Output tokens (including reasoning)', tokens.output === null ? 'Not recorded' : number(tokens.output)],
    ['Cached input / cache write', `${tokens.cached === null ? 'Not recorded' : number(tokens.cached)} / ${tokens.cacheWrite === null ? 'Not recorded' : number(tokens.cacheWrite)}`],
    ['Reasoning tokens', tokens.reasoning === null ? 'Not recorded' : number(tokens.reasoning)],
    ['Running attributed subtotal', usage.cumulativeCredits === undefined ? undefined : `${creditNumber(usage.cumulativeCredits)} AI credits${usage.cumulativePartial ? ' (incomplete)' : ''}`],
    ['Models', (usage.models || [usage.model]).filter(Boolean).map(modelName).join(', ') || 'Not recorded']
  ])}${calls.length ? usageTable(calls) : '<p>Per-call details are available when inspecting this prompt. No usage is inferred from message text.</p>'}<p>Missing usage is not zero. Cache counts not saved are treated as zero only for the labeled estimate. No legacy model multipliers or plan discounts are applied.</p></div></details>`;
}
function creditChartHtml() {
  const session = state.session;
  const usage = session.usage;
  if (!usage) return '';
  const models = [...new Set(session.requests.flatMap((request) => request.usage?.models.length ? request.usage.models : [request.model]))];
  const color = (model) => `hsl(${(models.indexOf(model) * 67 + 90) % 360},55%,55%)`;
  const max = Math.max(0, ...session.requests.map((request) => request.usage?.credits || 0));
  return `<section class="credit-card"><div class="section-title"><h2>Session usage summary ${tipBubble('Reference prices estimate token costs from a local GitHub pricing snapshot. They are not your invoice. Missing usage, cache counts and context tiers can make estimates incomplete.')}</h2><a class="button" href="/api/sessions/${session.id}/usage/export" download>Download credit report</a></div>${reportedConsumptionHtml(usage.reported)}<div class="credit-summary">${keyValues([
    ['Recorded priced AI credits', `${creditNumber(usage.credits)}${usage.partial ? ' (incomplete)' : ''}`],
    ['Turn-attributed subtotal', `${creditNumber(usage.attributedCredits)} AI credits`],
    ['Estimated USD cost', usage.usd === null ? 'Unavailable' : `$${creditNumber(usage.usd)}`],
    ['Turns priced / total', `${usage.pricedTurns} / ${usage.totalTurns}`],
    ['Recorded usage entries', number(usage.callCount)],
    ...[['input', 'Input tokens'], ['cached', 'Cached input tokens'], ['cacheWrite', 'Cache-write tokens'], ['output', 'Output tokens'], ['reasoning', 'Reasoning tokens (part of output)']].map(([key, label]) => [label, usage.tokens[key] === null ? 'Not recorded' : number(usage.tokens[key])])
  ])}</div><details class="story-metadata"><summary>Session model subtotals · tokens, costs and credits</summary><div class="usage-table-scroll"><table class="usage-table"><caption>Recorded usage only; unavailable activity is not counted as zero.</caption><thead><tr><th>Model</th><th>Entries</th><th>Input</th><th>Cached</th><th>Cache write</th><th>Output</th><th>AI credits</th><th>USD</th></tr></thead><tbody>${usage.modelCredits.map((item) => `<tr><th scope="row">${escapeHtml(modelName(item.model))}</th><td>${item.callCount}</td>${['input', 'cached', 'cacheWrite', 'output'].map((key) => `<td>${item.tokens[key] === null ? 'Not recorded' : number(item.tokens[key])}</td>`).join('')}<td>${escapeHtml(creditNumber(item.credits))}${item.partial ? ' *' : ''}</td><td>${item.usd === null ? 'Unavailable' : `$${escapeHtml(creditNumber(item.usd))}`}</td></tr>`).join('')}</tbody></table></div></details>${usage.unallocated?.length ? `<details class="story-metadata"><summary>Usage without a turn association · ${usage.unallocated.length} entries</summary><p>Included in the session summary, not assigned to a turn or its running subtotal.</p>${usageTable(usage.unallocated)}</details>` : ''}<h3>AI credits by turn</h3><p class="muted">Reference-price estimates · 1 AI credit = $${usage.pricing.usdPerCredit.toFixed(2)} USD. Bar lengths share one scale; colors identify models.</p><div class="credit-legend">${models.map((model) => `<span><i style="background:${color(model)}"></i>${escapeHtml(modelName(model))}</span>`).join('')}</div><div class="credit-chart"><div class="credit-chart-heading"><span>Turn</span><span>Models / relative consumption</span><span>AI credits / USD</span><span>Running subtotal</span></div>${session.requests.map((request) => {
    const turn = request.usage;
    const available = turn?.credits !== null && turn?.credits !== undefined;
    const names = turn?.models.length ? turn.models : [request.model];
    const label = `Turn ${request.index}: ${names.map(modelName).join(', ')}; ${creditNumber(turn?.credits)} AI credits; running attributed subtotal ${creditNumber(turn?.cumulativeCredits)}${turn?.cumulativePartial ? ', incomplete' : ''}`;
    return `<button class="credit-chart-row" data-select="${request.id}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"><span>${String(request.index).padStart(2, '0')}</span><span class="credit-bar-cell"><span class="credit-model-label">${names.map((model) => escapeHtml(modelName(model))).join(', ')}</span><span class="credit-bar-track" aria-hidden="true">${available ? (turn.modelCredits || []).filter((item) => item.credits !== null).map((item) => `<span class="credit-bar-segment" style="width:${max ? item.credits / max * 100 : 0}%;background:${color(item.model)}"></span>`).join('') : '<span class="credit-unavailable">Usage or price not recorded</span>'}</span></span><span>${escapeHtml(creditNumber(turn?.credits))}${turn?.partial ? ' *' : ''}<small>${turn?.usd === null || turn?.usd === undefined ? 'Unavailable USD' : `$${escapeHtml(creditNumber(turn.usd))}`}</small></span><span>${escapeHtml(creditNumber(turn?.cumulativeCredits))}${turn?.cumulativePartial ? ' *' : ''}</span></button>`;
  }).join('') || '<p>No turns recorded.</p>'}</div>${usage.aggregate ? `<details class="story-metadata"><summary>Latest session-wide aggregate · ${escapeHtml(creditNumber(usage.aggregate.credits))} estimated AI credits</summary><p>Saved ${date(usage.aggregate.timestamp)}. Cumulative snapshot, not added to turn costs: it can include activity whose turn or per-call context size was not persisted.</p>${usageTable(usage.aggregate.calls)}</details>` : ''}<p class="footnote">* Missing counts, unknown rates or context tiers make estimates incomplete. Intermediate model calls are itemized in each prompt's token bubble when persisted; tools and reasoning are not charged again separately. Pricing snapshot checked ${escapeHtml(usage.pricing.checkedAt)}. <a href="${escapeHtml(usage.pricing.source)}" target="_blank" rel="noopener noreferrer">GitHub pricing</a>. Scan for Updates refreshes saved session usage, not pricing; this is not a live billing meter or an invoice.</p></section>`;
}
function renderOverview(modelsOnly = false) {
  stopStory();
  records.clear();
  const session = state.session;
  const stats = session.stats;
  enterSession();
  state.detail = null; state.tab = 'readable';
  state.selected = session.overview.id;
  $('#breadcrumb').innerHTML = `Sessions <span>/</span> ${modelsOnly ? 'Model timeline' : 'Session overview'}`;
  $('.rail-button.active')?.classList.remove('active');
  $(modelsOnly ? '#models-button' : '#home-button').classList.add('active');
  const preview = session.requests.slice(0, 5);
  $('#reader').innerHTML = `<article class="reader-inner">
    <div class="session-eyebrow">${modelsOnly ? 'RECORDED MODELS' : 'SESSION OVERVIEW'}</div>
    <div class="hero"><h1>${modelsOnly ? 'Model timeline' : escapeHtml(session.title)}</h1></div>
    <div class="session-meta"><span>${icon('calendar-days')}${date(session.createdAt, { year: 'numeric', hour: undefined, minute: undefined })}</span><span>${icon('cpu')}${stats.models} ${stats.models === 1 ? 'model' : 'models'}</span>${badge('Read-only source', 'shield-check', true)}<span>${icon('hash')}${escapeHtml(session.sessionId.slice(0, 8))}</span>${!modelsOnly ? `<button class="button primary" data-read-story>${icon('book-open')} Read full session</button><button class="button summary-action-button" id="create-summary-button" data-create-summary>${icon('file-text')} Create session summary</button>${savedSummaryButtonHtml('session', session.id, session.title)}${sessionSummaryLinkHtml(session.id)}` : ''}</div>
    ${warningsHtml(session.warnings)}
    ${modelsOnly ? `${modelTimelineHtml()}<div class="footnote">${icon('info')}Model changes are detected between persisted requests. Internal routing or changes not saved by VS Code cannot be inferred. Tool-specific subagent model metadata is shown on its tool item.</div>` : `
    <div class="metrics">${metric('User prompts', stats.prompts, 'message-square', 'Recorded prompts')}${metric('Tool calls', stats.tools, 'terminal', 'Recorded invocations')}${metric('File operations', stats.edits, 'file-diff', 'Persisted editing history')}${metric('Reasoning blocks', stats.reasoning, 'brain', 'Including unavailable text')}</div>
    ${creditChartHtml()}
    <div class="overview-columns"><section><div class="section-title"><h2>Conversation <span>${stats.prompts} prompts</span></h2><button class="section-link" id="browse-prompts">All prompts ${icon('arrow-up-right')}</button></div><div class="activity-card"><div class="activity-header"><span>RECENT PROMPTS</span>${icon('messages-square')}</div>
    ${preview.map((request) => `<button class="prompt-preview" data-select="${request.id}"><div class="preview-top"><span class="prompt-chip">PROMPT ${String(request.index).padStart(2, '0')}</span><time>${date(request.timestamp)}</time></div><div class="preview-text">${escapeHtml(request.title)}</div><div class="preview-bottom"><span>${escapeHtml(modelName(request.model))}</span><span>${request.children.filter((child) => child.kind === 'tool').length} tool calls</span><span>${number(request.children.length)} items</span></div></button>`).join('') || '<div class="empty-state">This session has no persisted prompts.</div>'}
    </div><div class="footnote">${icon('corner-down-right')}Select a prompt in the explorer to follow its story. Everything beneath it belongs to that turn.</div></section>
    <div class="overview-side"><div><div class="section-title"><h2>Model timeline</h2>${badge(`${Math.max(0, session.modelTimeline.length - 1)} switches`, null)}</div>${modelTimelineHtml()}</div>
    <div><div class="section-title"><h2>Connected sources</h2>${icon('layers')}</div><div class="source-list">
    ${session.sessionFormat === 'agent-host'
      ? `${sourceRow('Agent event stream', `events.jsonl (${number(session.sources.transcript)} events)`, true, 'activity')}${sourceRow('Workspace metadata', 'workspace.yaml', !!session.sources.workspaceYaml, 'folder-git-2')}${sourceRow('Recorded file edits', `${number(stats.edits)} operations`, !!session.sources.editing, 'files')}${sourceRow('Model metadata', 'Connected', !!session.sources.models, 'cpu')}${sourceRow('Checkpoints', `${number(session.sources.checkpoints || 0)} saved`, !!session.sources.checkpoints, 'flag')}`
      : `${sourceRow('Persisted session', session.sources.session, true, 'messages-square')}${sourceRow('Agent transcript', `${number(session.sources.transcript)} events`, !!session.sources.transcript, 'activity')}${sourceRow('Editing snapshots', session.sources.editing ? 'Connected' : 'Not found', session.sources.editing, 'files')}${sourceRow('Model catalog', session.sources.models ? 'Connected' : 'Not found', session.sources.models, 'cpu')}${sourceRow('Debug log', `${number(session.sources.debug)} events`, !!session.sources.debug, 'scan-line')}`}</div></div></div></div>
    <hr class="section-divider"><div class="section-title"><h2>Source file</h2>${badge('Read-only', 'hard-drive', true)}</div><div class="source-path">${escapeHtml(session.file)}</div>`}
    </article>`;
  $('#reader').scrollTop = 0;
  renderTree();
  refreshIcons($('#reader'));
  refreshSavedSummaryButtons();
}
function sourceRow(label, value, available, name) {
  return `<div class="source-row">${icon(name)}<span>${label}</span><span class="source-value${available ? '' : ' unavailable'}">${available ? (label === 'Persisted session' ? '.json / .jsonl' : escapeHtml(value)) : 'Not found'}</span></div>`;
}

function parentPrompt(id) {
  let node = state.nodes.get(id);
  while (node && node.kind !== 'prompt') node = state.nodes.get(state.parents.get(node.id));
  return node;
}
async function selectNode(id) {
  const item = state.nodes.get(id);
  if (!item) return;
  if (item.kind === 'overview') { renderOverview(); return; }
  stopStory();
  enterSession();
  state.selected = id;
  state.tab = 'readable';
  let parent = state.parents.get(id);
  while (parent) { state.expanded.add(parent); parent = state.parents.get(parent); }
  renderTree();
  $('.rail-button.active')?.classList.remove('active');
  const prompt = parentPrompt(id);
  $('#breadcrumb').innerHTML = `Sessions <span>/</span>${prompt ? `Prompt ${String(prompt.index).padStart(2, '0')} <span>/</span>` : ''}${escapeHtml(humanize(item.kind))}`;
  $('#reader').innerHTML = '<div class="loading-state"><span class="spinner"></span> Reading recorded contents...</div>';
  const sessionId = state.session.id;
  try {
    const detail = state.cache.get(id) || await api(`/api/sessions/${sessionId}/nodes/${id}`);
    if (state.selected !== id || state.session.id !== sessionId) return;
    state.cache.set(id, detail); state.detail = detail;
    renderDetail();
    $('#reader').scrollTop = 0;
  } catch (error) {
    if (state.selected === id) $('#reader').innerHTML = `<div class="empty-state">${icon('triangle-alert')} ${escapeHtml(error.message)}</div>`;
    refreshIcons();
  }
}
function renderDetail() {
  const item = state.detail;
  if (!item) return;
  stopStory();
  records.clear();
  const prompt = parentPrompt(item.id);
  const tabs = item.before !== undefined && item.after !== undefined
    ? [['readable', 'Changes'], ['before', 'Before'], ['after', 'After'], ['raw', 'Raw record']]
    : [[ 'readable', item.kind === 'prompt' ? 'Conversation story' : 'Readable'], ['raw', 'Raw record']];
  const title = item.kind === 'prompt' ? `Prompt ${String(prompt?.index || item.index).padStart(2, '0')}` :
    item.kind === 'response' ? 'Assistant response' : item.kind === 'reasoning' ? 'Recorded reasoning' : item.title;
  $('#reader').innerHTML = `<article class="reader-inner"><header class="detail-header"><div class="detail-symbol">${icon(icons[item.kind] || 'activity')}</div><div><div class="detail-kicker">${escapeHtml(item.kind === 'prompt' ? 'USER MESSAGE' : humanize(item.kind))}${prompt && item.kind !== 'prompt' ? ` / PROMPT ${String(prompt.index).padStart(2, '0')}` : ''}</div><h1>${escapeHtml(title)}</h1><div class="detail-meta">${item.model || prompt?.model ? badge(modelName(item.model || prompt?.model), 'cpu', true) : ''}${badge(item.source, 'database')}${item.timestamp ? badge(date(item.timestamp), 'clock-3') : ''}${item.duration !== undefined && item.duration !== null ? badge(duration(item.duration), 'timer') : ''}${item.hidden ? badge('Hidden in original transcript', 'eye-off') : ''}${item.failed ? badge('Tool reported an error', 'triangle-alert') : ''}</div>${tokenBubble(item.usage)}</div></header>
    <div class="detail-tabs" role="tablist">${tabs.map(([key, label]) => `<button class="detail-tab${state.tab === key ? ' active' : ''}" role="tab" aria-selected="${state.tab === key}" data-tab="${key}">${label}</button>`).join('')}<button class="icon-button" id="copy-item" title="Copy current item" aria-label="Copy current item">${icon('copy')}</button></div>
    <div class="content-panel" role="tabpanel">${state.tab === 'raw' ? `${item.rawTruncated ? `<div class="footnote">${icon('scissors')}This record is very large, so the preview is shortened. Long strings and lists are trimmed and marked; the source file is unchanged.</div>` : ''}${codeBlock(JSON.stringify(item.raw, null, 2), 'json', 'Original persisted record · JSON')}` :
      state.tab === 'before' || state.tab === 'after' ? codeBlock(item[state.tab], languageFor(item.file), `${state.tab === 'before' ? 'Before' : 'After'} · ${item.file}`) : renderReadable(item)}</div>
    </article>`;
  if (state.results && state.highlight?.nodeId === item.id && !$('#breadcrumb [data-back-results]')) {
    $('#breadcrumb').insertAdjacentHTML('afterbegin', `<button class="back-to-results" data-back-results>${icon('arrow-left')} Results</button>`);
    refreshIcons($('#breadcrumb'));
  }
  refreshIcons($('#reader'));
  if (state.highlight?.nodeId === item.id) {
    const hit = markTerms($('.content-panel'), state.highlight.terms);
    if (hit) requestAnimationFrame(() => hit.scrollIntoView({ block: 'center' }));
  }
  if (item.kind === 'prompt' && state.tab === 'readable') {
    mountStory($('#prompt-story'), `/api/sessions/${state.session.id}/story?parent=${item.id}`, storyVersion);
  }
}
function languageFor(file = '') {
  const ext = file.split('.').at(-1).toLowerCase();
  return ({ js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', json: 'json', css: 'css', html: 'xml', md: 'markdown', py: 'python', ps1: 'powershell', yml: 'yaml', yaml: 'yaml', sh: 'bash' })[ext] || '';
}
function keyValues(entries) {
  const tips = {
    'Recorded priced AI credits': 'A reference-price estimate from saved usage and the local GitHub pricing file, not reported consumption or an invoice.',
    'Input tokens': 'Input includes cached input. The estimate charges cached and uncached portions at their respective rates without counting them twice.',
    'Cached input tokens': 'Previously processed input reused by the model. Missing cache counts are unknown, not evidence that no caching occurred.',
    'Cached input / cache write': 'Cache reads reuse prior context; cache writes save context. Each has a separate rate when the model pricing specifies one.',
    'Reasoning tokens': 'Reasoning tokens are already part of output tokens. They are not charged a second time.',
    'Reasoning tokens (part of output)': 'Reasoning is included in output totals. A saved count does not guarantee that readable reasoning text was persisted.',
    'Running attributed subtotal': 'Running total of priced calls associated with this turn and earlier turns. Session-only usage is excluded and missing calls cannot be inferred.'
  };
  return `<dl class="key-values">${entries.filter(([, value]) => value !== undefined && value !== null).map(([key, value]) => `<dt>${escapeHtml(key)}${tips[key] ? tipBubble(tips[key]) : ''}</dt><dd>${escapeHtml(value)}</dd>`).join('')}</dl>`;
}
function relatedItems(id) {
  const children = state.nodes.get(id)?.children || [];
  if (!children.length) return '';
  return `<div class="section-title"><h2>Recorded items <span>${children.length}</span></h2></div><div class="related-items">${children.map((child) => `<button class="related-item" data-select="${child.id}">${icon(icons[child.kind] || 'activity')}<span>${escapeHtml(child.title)}</span>${icon('arrow-up-right')}</button>`).join('')}</div>`;
}
function renderReadable(item) {
  if (item.kind === 'prompt') {
    const raw = item.raw;
    return `<section class="story-prompt-text">${markdown(item.text)}</section><details class="story-metadata"><summary>${icon('sliders-horizontal')} Prompt metadata & model configuration</summary>${keyValues([
      ['Model', item.model], ['Agent', raw.agent?.fullName || raw.agent?.name], ['Mode', raw.modeInfo?.name || raw.modeInfo?.kind],
      ['Input tokens', raw.promptTokens === undefined ? undefined : number(raw.promptTokens)], ['Output tokens', raw.completionTokens === undefined ? undefined : number(raw.completionTokens)],
      ['Elapsed', raw.elapsedMs === undefined ? undefined : duration(raw.elapsedMs)], ['Request ID', raw.requestId]
    ])}${raw.modelConfiguration ? `<div class="tool-section"><h3>Model configuration</h3>${renderRecord(raw.modelConfiguration)}</div>` : ''}</details><div class="story-divider"><span>TURN ACTIVITY</span></div><div id="prompt-story" class="story-stream"></div>`;
  }
  if (item.kind === 'response') return markdown(item.text);
  if (item.kind === 'reasoning') {
    return item.available ? markdown(item.text) : `<div class="empty-reasoning">${icon('brain')}<h3>This reasoning text wasn't saved.</h3><p>The session contains reasoning markers or opaque IDs, but no readable reasoning transcript for this block. Those IDs are not text and cannot be decoded. The complete persisted records are available in the Raw record tab.</p></div>`;
  }
  if (item.kind === 'model') {
    return `${keyValues([['Previous model', item.raw.from || 'Initial selection'], ['Selected model', item.raw.to], ['Effective at', `Prompt ${item.raw.prompt}`]])}<div class="tool-section"><h3>Recorded configuration</h3>${renderRecord(item.raw.configuration || {})}</div>`;
  }
  if (item.kind === 'tool') return renderTool(item);
  if (item.kind === 'edit') {
    if (item.diff) return renderDiff(item);
    const edits = item.raw.edits;
    return `${item.file ? `<div class="source-path">${escapeHtml(item.file)}</div>` : ''}<div class="footnote">${icon('info')}${item.before !== undefined && item.after !== undefined ? 'Diff computation exceeded its time limit. Complete before and after contents are available in their tabs.' : 'Recorded edit payload. A complete before/after pair is not available here; reconstructed changes, when available, are under File edit history.'}</div>${edits ? edits.flat().map((edit) => `<div class="tool-section"><h3>${edit.range ? `Lines ${edit.range.startLineNumber}:${edit.range.startColumn} – ${edit.range.endLineNumber}:${edit.range.endColumn}` : 'Recorded edit'}</h3>${codeBlock(edit.text ?? JSON.stringify(edit, null, 2), languageFor(item.file))}</div>`).join('') : renderRecord(item.raw)}`;
  }
  if (item.kind === 'group') return `<p class="group-hint">${escapeHtml(item.raw.description)}</p>${relatedItems(item.id)}`;
  if (item.kind === 'event') {
    const data = item.raw.data || item.raw.attrs;
    return `${item.text ? markdown(item.text) : ''}${data ? `<div class="tool-section"><h3>Event data</h3>${renderRecord(data)}</div>${keyValues([['Event type', item.raw.type], ['Event ID', item.raw.id], ['Parent ID', item.raw.parentId], ['Source line', item.line]])}` : renderRecord(item.raw)}`;
  }
  return renderRecord(item.raw);
}
function toolOutputsHtml(item) {
  const variants = item.resultVariants;
  if (!variants) return '';
  return `${item.resultVariantsTruncated ? '<p class="usage-warning">Saved output exceeds the preview limit. Some content shown below is truncated.</p>' : ''}
    ${variants.modelFacing !== undefined ? `<div class="tool-section"><h3>Model-facing result ${tipBubble('result.content is the concise result sent to the model. The runtime may truncate it. It is not necessarily the complete tool output.')}</h3>${codeBlock(variants.modelFacing, '', variants.modelFacing === '' ? 'Saved empty string' : 'result.content')}</div>` : ''}
    ${variants.detailed !== undefined ? `<details class="tool-section"><summary>Saved detailed display output</summary><p>${tipBubble('result.detailedContent is display-oriented output saved by the runtime. It can contain more than the model-facing result, but is not guaranteed to be complete.')} Separate from the model-facing result.</p>${codeBlock(variants.detailed, '', variants.detailed === '' ? 'Saved empty string' : 'result.detailedContent')}</details>` : ''}
    ${variants.blocks !== undefined ? `<details class="tool-section"><summary>Structured result blocks (${variants.blocks.length})</summary><p>${tipBubble('result.contents preserves structured text, terminal, image, audio and resource blocks. References are inspected as saved data; Chronicle does not fetch files or remote resources.')} Saved structured data; referenced resources are not loaded.</p>${renderRecord(variants.blocks)}</details>` : ''}`;
}
function renderTool(item, inline = false) {
  const raw = item.raw;
  const specific = raw.toolSpecificData || {};
  const command = specific.commandLine?.original || (typeof specific.commandLine === 'string' ? specific.commandLine : null);
  const result = raw.resultDetails;
  const output = result?.output;
  const duplicateOutput = item.resultVariants?.modelFacing !== undefined &&
    (typeof output === 'string' || (Array.isArray(output) && output.every((entry) => typeof entry === 'string' || entry?.isText))) &&
    textOf(output) === item.resultVariants.modelFacing;
  const metadata = { ...result };
  delete metadata.output;
  if (item.resultVariants) { delete metadata.content; delete metadata.detailedContent; delete metadata.contents; }
  return `${raw.invocationMessage ? markdown(textOf(raw.pastTenseMessage) || textOf(raw.invocationMessage)) : ''}
    ${inline ? '' : keyValues([['Tool', raw.toolId], ['Call ID', raw.toolCallId], ['Status', item.failed ? 'Reported error' : raw.isComplete ? 'Completed' : 'Completion not recorded'], ['Duration', item.duration === null ? undefined : duration(item.duration)], ['Source', raw.source?.label]])}
    ${command ? `<div class="tool-section"><h3>Terminal command</h3>${codeBlock(command, specific.language === 'pwsh' ? 'powershell' : 'bash')}</div>` : ''}
    ${item.arguments !== undefined ? `<div class="tool-section"><h3>Tool input</h3>${codeBlock(typeof item.arguments === 'string' ? item.arguments : JSON.stringify(item.arguments, null, 2), typeof item.arguments === 'object' ? 'json' : '')}</div>` : ''}
    ${toolOutputsHtml(item)}
    ${!duplicateOutput && output !== undefined && output !== null ? `<div class="tool-section"><h3>Recorded tool output ${tipBubble('The saved format does not identify this as model-facing, detailed or structured output. Its completeness is unknown.')}</h3>${Array.isArray(output) ? output.map((entry) => entry?.isText || typeof entry === 'string' ? codeBlock(textOf(entry), '', 'Recorded output') : renderRecord(entry)).join('') : codeBlock(typeof output === 'string' ? output : JSON.stringify(output, null, 2))}</div>` : ''}
    ${Object.keys(metadata).length ? `<details class="tool-section"><summary>Result metadata</summary>${renderRecord(metadata)}</details>` : !result && !item.resultVariants && !inline ? '<div class="footnote">' + icon('info') + 'No separate result payload was persisted for this tool. Related events may provide additional context.</div>' : ''}
    ${specific.kind === 'subagent' ? `<div class="tool-section"><h3>Subagent prompt</h3>${markdown(specific.prompt || '(Not recorded)')}<h3>Subagent result</h3>${markdown(specific.result || '(Not recorded)')}</div>` : ''}
    ${Object.keys(specific).length ? `<${inline ? 'details' : 'div'} class="tool-section">${inline ? '<summary>Additional tool metadata</summary>' : '<h3>Tool-specific data</h3>'}${renderRecord(specific)}</${inline ? 'details' : 'div'}>` : ''}${inline ? '' : relatedItems(item.id)}`;
}
function renderDiff(item) {
  let oldLine = 1;
  let newLine = 1;
  let additions = 0;
  let deletions = 0;
  const lines = item.diff.map((part) => {
    const list = part.value.split('\n');
    if (list.at(-1) === '') list.pop();
    if (part.added) additions += list.length;
    if (part.removed) deletions += list.length;
    return list.map((line) => `<div class="diff-line${part.added ? ' added' : part.removed ? ' removed' : ''}"><span class="line-number">${part.added ? '' : oldLine++}</span><span class="line-number">${part.removed ? '' : newLine++}</span><span class="line-sign">${part.added ? '+' : part.removed ? '-' : ' '}</span><span class="line-content">${escapeHtml(line.replace(/\r$/, ''))}</span></div>`).join('');
  }).join('');
  return `<div class="diff-toolbar"><span>${escapeHtml(item.file)}</span><span class="diff-stats"><span class="addition">+${additions}</span><span class="deletion">−${deletions}</span></span></div><div class="diff-body">${lines || '<div class="empty-state">No text change in this operation.</div>'}</div><div class="footnote">${icon('git-compare-arrows')}${item.source === 'Saved snapshots' ? 'Exact saved content blobs. Session-wide original versus saved current version; not a single-prompt diff.' : `Reconstructed from the persisted edit timeline. Epoch ${item.epoch ?? 'not recorded'}.`} Source files are never opened or modified.</div>`;
}

function renderStoryContext(value) {
  const texts = [];
  function collect(current, key = '') {
    if (typeof current === 'string') {
      if (current.trim() && (/^(text|value|content|message|summary|summaries|description|prompt|result|output)$/i.test(key) || current.length > 200)) texts.push(current);
    } else if (Array.isArray(current)) current.forEach((entry) => collect(entry, key));
    else if (current && typeof current === 'object') Object.entries(current).forEach(([name, entry]) => collect(entry, name));
  }
  collect(value);
  return `${texts.map((text) => markdown(text)).join('')}<details class="story-metadata"><summary>${icon('list-tree')} ${texts.length ? 'Supporting' : 'Recorded'} metadata</summary>${renderRecord(value)}</details>`;
}
function renderStoryItem(item) {
  const label = { response: 'Copilot', reasoning: 'Reasoning', prompt: `You / Prompt ${String(item.index).padStart(2, '0')}`, tool: item.toolName || 'Tool activity', edit: 'File change', model: 'Model selection', context: item.title, event: item.title }[item.kind] || humanize(item.kind);
  let contents;
  if (item.kind === 'prompt') {
    contents = `<div class="story-prompt-text">${markdown(item.text)}</div>${item.raw.modelConfiguration ? `<details class="story-metadata"><summary>${icon('cpu')} Model configuration</summary>${renderRecord(item.raw.modelConfiguration)}</details>` : ''}`;
  } else if (item.kind === 'response') contents = markdown(item.text);
  else if (item.kind === 'reasoning') {
    contents = item.available ? markdown(item.text) : '<div class="story-unavailable">Reasoning was recorded, but its text was not persisted.</div>';
  } else if (item.kind === 'tool') contents = renderTool(item, true);
  else if (item.kind === 'group') {
    return `<details class="story-source-group" data-story-group="${item.id}"><summary>${icon(icons[item.kind] || 'folder')} ${escapeHtml(item.title)} <span>${number(item.childCount)} source items · expands here</span></summary><p class="group-hint">${escapeHtml(item.raw.description || 'Additional recorded source data.')}</p><div class="story-stream"></div></details>`;
  } else if (item.kind === 'context' || item.kind === 'event') {
    contents = renderStoryContext(item.raw);
  } else contents = renderReadable(item);
  return `<section class="story-item story-${item.kind}" data-story-item="${item.id}"><header class="story-item-header"><span class="story-speaker">${icon(icons[item.kind] || 'activity')}${escapeHtml(label)}</span>${item.kind === 'prompt' && item.model ? badge(modelName(item.model), 'cpu', true) : ''}${item.timestamp ? `<time>${date(item.timestamp)}</time>` : ''}${item.failed ? badge('Reported error', 'triangle-alert') : ''}<button class="icon-button story-inspect" data-select="${item.id}" title="Inspect original record" aria-label="Inspect original record">${icon('scan-line')}</button></header>${tokenBubble(item.usage)}${contents}</section>`;
}
function mountStory(container, endpoint, version) {
  if (!container) return;
  let offset = 0;
  let loading = false;
  let finished = false;
  const sentinel = document.createElement('div');
  sentinel.className = 'story-sentinel';
  sentinel.innerHTML = '<span class="spinner"></span><span>Loading recorded items...</span>';
  container.append(sentinel);
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) load();
  }, { root: $('#reader'), rootMargin: '1000px 0px' });
  storyObservers.add(observer);
  async function load() {
    if (loading || finished || version !== storyVersion) return;
    loading = true;
    try {
      const page = await api(`${endpoint}${endpoint.includes('?') ? '&' : '?'}offset=${offset}&limit=16`);
      if (version !== storyVersion || !container.isConnected) return;
      const batch = document.createElement('div');
      batch.className = 'story-batch';
      batch.innerHTML = page.items.map(renderStoryItem).join('');
      container.insertBefore(batch, sentinel);
      refreshIcons(batch);
      if (page.nextOffset === null) {
        finished = true;
        observer.disconnect(); storyObservers.delete(observer);
        sentinel.className = 'story-end';
        sentinel.textContent = `All ${number(page.total)} recorded items in this section are shown.`;
      } else {
        offset = page.nextOffset;
        sentinel.innerHTML = '<span class="spinner"></span><span>The story continues as you scroll...</span>';
      }
    } catch (error) {
      if (version !== storyVersion) return;
      observer.disconnect();
      sentinel.innerHTML = `<span class="story-error">${escapeHtml(error.message)}</span><button class="button" type="button">Retry loading</button>`;
      sentinel.querySelector('button').addEventListener('click', () => { observer.observe(sentinel); load(); }, { once: true });
    } finally { loading = false; }
    if (!finished && version === storyVersion && !sentinel.querySelector('button')) {
      requestAnimationFrame(() => {
        if (sentinel.getBoundingClientRect().top < $('#reader').getBoundingClientRect().bottom + 1000) load();
      });
    }
  }
  observer.observe(sentinel);
  load();
}
function renderSessionStory() {
  if (!state.session) return;
  stopStory(); records.clear();
  enterSession();
  state.detail = null; state.selected = state.session.overview.id;
  $('.rail-button.active')?.classList.remove('active');
  $('#story-button').classList.add('active');
  $('#breadcrumb').innerHTML = 'Sessions <span>/</span> Full session story';
  $('#reader').innerHTML = `<article class="reader-inner story-reader"><div class="session-eyebrow">FULL SESSION</div><div class="hero"><h1>${escapeHtml(state.session.title)}</h1></div><div class="session-meta">${badge(`${state.session.stats.prompts} prompts`, 'messages-square', true)}${badge('Chronological', 'book-open')}<span>Items load as you scroll.</span></div>${warningsHtml(state.session.warnings)}<div id="session-story" class="story-stream"></div></article>`;
  $('#reader').scrollTop = 0;
  renderTree(); refreshIcons($('#reader'));
  mountStory($('#session-story'), `/api/sessions/${state.session.id}/story`, storyVersion);
}

function moveSelection(direction) {
  if (state.mode !== 'session' || !state.visible.length) return;
  const index = state.visible.indexOf(state.selected);
  const next = index < 0 ? 0 : Math.max(0, Math.min(state.visible.length - 1, index + direction));
  selectNode(state.visible[next]);
}
const termPattern = (terms) => new RegExp(terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi');
function highlightSnippet(text, terms) {
  const pattern = termPattern(terms);
  let html = '';
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    html += `${escapeHtml(text.slice(last, match.index))}<mark>${escapeHtml(match[0])}</mark>`;
    last = match.index + match[0].length;
  }
  return html + escapeHtml(text.slice(last));
}
function markTerms(root, terms) {
  if (!root || !terms?.length) return null;
  const pattern = termPattern(terms);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => node.parentElement.closest('mark, script, style, button') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
  });
  const targets = [];
  while (walker.nextNode() && targets.length < 500) { pattern.lastIndex = 0; if (pattern.test(walker.currentNode.nodeValue)) targets.push(walker.currentNode); }
  for (const node of targets) {
    const fragment = document.createDocumentFragment();
    const text = node.nodeValue;
    let last = 0;
    for (const match of text.matchAll(pattern)) {
      fragment.append(text.slice(last, match.index));
      const mark = document.createElement('mark');
      mark.className = 'search-hit';
      mark.textContent = match[0];
      fragment.append(mark);
      last = match.index + match[0].length;
    }
    fragment.append(text.slice(last));
    node.replaceWith(fragment);
  }
  return root.querySelector('mark.search-hit');
}
async function runGlobalSearch(query, scope = $('#search-scope').value) {
  query = query.trim();
  if (!query) return;
  const sequence = ++state.globalSequence;
  const sessionId = scope === 'session' && state.session ? state.session.id : '';
  stopStory();
  state.view = 'results';
  $('.rail-button.active')?.classList.remove('active');
  $('#global-search-button').classList.add('active');
  $('#breadcrumb').innerHTML = `Search <span>/</span> ${escapeHtml(sessionId ? state.session.title : 'All sessions')}`;
  $('#reader').innerHTML = '<div class="loading-state"><span class="spinner"></span> Searching your conversations...</div>';
  try {
    const result = await api(`/api/search?q=${encodeURIComponent(query)}${sessionId ? `&session=${sessionId}` : ''}`);
    if (sequence !== state.globalSequence) return;
    state.results = { ...result, query, scope, sessionId };
    renderResults();
  } catch (error) {
    if (sequence === state.globalSequence) $('#reader').innerHTML = `<div class="empty-state">${icon('triangle-alert')} ${escapeHtml(error.message)}</div>`;
    refreshIcons($('#reader'));
  }
}
function renderResults() {
  const { results, total, truncated, terms = [], query, sessionId, counts, pending } = state.results;
  stopStory();
  state.view = 'results';
  state.selected = null;
  $('.rail-button.active')?.classList.remove('active');
  $('#global-search-button').classList.add('active');
  $('#breadcrumb').innerHTML = `Search <span>/</span> ${escapeHtml(sessionId ? (state.library.find((item) => item.id === sessionId)?.title || 'This session') : 'All sessions')}`;
  const groups = new Map();
  for (const hit of results) {
    if (!groups.has(hit.sessionId)) groups.set(hit.sessionId, []);
    groups.get(hit.sessionId).push(hit);
  }
  $('#reader').innerHTML = `<article class="reader-inner results-page">
    <div class="session-eyebrow"><span class="line"></span> SEARCH ${sessionId ? 'THIS SESSION' : 'EVERY SESSION'}</div>
    <div class="results-hero"><h1>“${escapeHtml(query)}”</h1><p>${total ? `${number(total)} ${total === 1 ? 'match' : 'matches'} in ${number(Object.keys(counts).length)} ${Object.keys(counts).length === 1 ? 'session' : 'sessions'}${truncated ? ` · showing the first ${number(results.length)}` : ''}` : 'No matches found. Try fewer or different words.'}</p>
    ${pending ? `<div class="footnote">${icon('loader')}${number(pending)} ${pending === 1 ? 'session is' : 'sessions are'} still being indexed; search again shortly for complete results.</div>` : ''}</div>
    ${[...groups].map(([id, hits]) => `<section class="result-group"><div class="result-session">${icon('messages-square')}<span class="result-session-title">${escapeHtml(hits[0].sessionTitle)}</span><span class="muted">${escapeHtml(hits[0].workspaceName)}</span><span class="node-count">${number(counts[id])}</span></div>
      ${hits.map((hit) => `<button class="result-row" data-result-session="${hit.sessionId}" data-result-node="${hit.nodeId}" data-result-prompt="${hit.promptIndex}">${icon(icons[hit.kind] || 'activity', 'result-icon')}<span class="result-kind">${escapeHtml(kindLabels[hit.kind] || humanize(hit.kind))}${hit.promptIndex ? ` · P${String(hit.promptIndex).padStart(2, '0')}` : ''}</span><span class="result-snippet">${highlightSnippet(hit.snippet, terms)}</span>${icon('arrow-up-right', 'result-go')}</button>`).join('')}
    </section>`).join('')}
  </article>`;
  $('#reader').scrollTop = 0;
  refreshIcons($('#reader'));
}
async function openResult(sessionId, nodeId, promptIndex) {
  state.highlight = { nodeId, terms: state.results?.terms || [] };
  if (state.session?.id !== sessionId || state.mode !== 'session') {
    if (!(await loadSession(sessionId, { render: false }))) return;
  }
  const target = state.nodes.has(nodeId) ? nodeId : state.session.requests[(promptIndex || 1) - 1]?.id;
  if (!target) { renderOverview(); toast('That item is no longer in this session.'); return; }
  state.highlight.nodeId = target;
  await selectNode(target);
  $('#tree-scroll').querySelector(`[data-node="${target}"]`)?.scrollIntoView({ block: 'center' });
}
let locationDraft = [];
let selectedLocation = -1;
let checkedLocation = null;
let folderListing = null;
let locationSequence = 0;
function resetLocationCheck() {
  locationSequence++;
  checkedLocation = null;
  $('#add-location').disabled = true;
  $('#location-check-result').textContent = '';
  $('#add-location').textContent = selectedLocation < 0 ? 'Add location' : 'Update location';
}
function setLocationPath(value) {
  $('#path-input').value = value;
  resetLocationCheck();
}
function renderLocations() {
  $('#scan-location-list').innerHTML = locationDraft.map((input, index) => `<div class="scan-location-row${selectedLocation === index ? ' selected' : ''}"><button type="button" class="location-remove icon-button" data-remove-location="${index}" aria-label="Remove ${escapeHtml(input)}" title="Remove location">${icon('x')}</button><button type="button" class="location-select" data-location="${index}" title="${escapeHtml(input)}">${escapeHtml(input)}</button></div>`).join('') || '<p class="muted">No scan locations. Add a location above.</p>';
  refreshIcons($('#scan-location-list'));
}
function openDialog(source = 'vscode') {
  if ($('#open-dialog').open) return;
  $('#import-error').textContent = '';
  locationDraft = [...state.locations];
  selectedLocation = -1;
  setLocationPath(source === 'agent' ? state.defaultPaths.agentSessions : state.defaultPaths.vscodeStorage);
  $('#folder-browser').hidden = true;
  renderLocations();
  $('#open-dialog').showModal();
  $('#path-input').focus();
  $('#path-input').select();
}
function openAgentDialog() { openDialog('agent'); }
async function browseLocation(input = $('#path-input').value.trim()) {
  const sequence = ++locationSequence;
  $('#import-error').textContent = '';
  try {
    const listing = await api(`/api/folders?path=${encodeURIComponent(input)}`);
    if (sequence !== locationSequence) return;
    folderListing = listing;
    setLocationPath(listing.path);
    $('#folder-browser').hidden = false;
    $('#folder-current').textContent = listing.path;
    $('#folder-drive').innerHTML = listing.drives.map((drive) => `<option${listing.path.toLowerCase().startsWith(drive.toLowerCase()) ? ' selected' : ''}>${escapeHtml(drive)}</option>`).join('');
    $('#folder-children').innerHTML = listing.directories.map((entry, index) => `<button type="button" class="folder-child" data-folder-index="${index}">${icon('folder-open')}${escapeHtml(entry.name)}</button>`).join('') || '<p class="muted">No subfolders. The current directory is selected above.</p>';
    refreshIcons($('#folder-children'));
  } catch (error) {
    if (sequence === locationSequence) {
      $('#folder-browser').hidden = true;
      $('#import-error').textContent = `Could not browse this directory: ${error.message}`;
    }
  }
}
document.addEventListener('click', async (event) => {
  const target = event.target.closest('button, [data-node], [data-toggle], [data-open-job-log]');
  if (!target) return;
  const toggle = event.target.closest('[data-toggle]');
  if (toggle) {
    const id = toggle.dataset.toggle;
    state.expanded.has(id) ? state.expanded.delete(id) : state.expanded.add(id);
    renderTree();
    return;
  }
  if (target.dataset.removeLocation !== undefined) {
    const index = Number(target.dataset.removeLocation);
    locationDraft.splice(index, 1);
    if (selectedLocation === index) { selectedLocation = -1; setLocationPath(''); }
    else if (selectedLocation > index) selectedLocation--;
    renderLocations();
    return;
  }
  if (target.dataset.location !== undefined) {
    selectedLocation = Number(target.dataset.location);
    setLocationPath(locationDraft[selectedLocation]);
    $('#folder-browser').hidden = true;
    renderLocations();
    return;
  }
  if (target.dataset.folderIndex !== undefined) { await browseLocation(folderListing.directories[Number(target.dataset.folderIndex)].path); return; }
  if (target.dataset.session) { await loadSession(target.dataset.session); return; }
  if (target.dataset.workspaceToggle !== undefined) {
    const id = target.dataset.workspaceToggle;
    state.collapsedWorkspaces.has(id) ? state.collapsedWorkspaces.delete(id) : state.collapsedWorkspaces.add(id);
    renderLibraryTree();
    return;
  }
  if (target.dataset.workspace !== undefined) {
    await loadWorkspace(target.dataset.workspace);
    return;
  }
  if (target.dataset.resultSession) { await openResult(target.dataset.resultSession, target.dataset.resultNode, Number(target.dataset.resultPrompt)); return; }
  if (target.hasAttribute('data-back-results') && state.results) { renderResults(); return; }
  if (target.hasAttribute('data-library')) { showLibrary(); return; }
  if (target.dataset.select || target.dataset.node) {
    await selectNode(target.dataset.select || target.dataset.node);
    return;
  }
  if (target.dataset.close) { document.getElementById(target.dataset.close).close(); return; }
  if (target.hasAttribute('data-open')) { openDialog(); return; }
  if (target.hasAttribute('data-open-agent')) { openAgentDialog(); return; }
  if (target.dataset.sortToggle) {
    const kind = target.dataset.sortToggle;
    if (kind === 'date') setSortOrder(state.sortBy === 'date-desc' ? 'date-asc' : 'date-desc');
    else if (kind === 'name') setSortOrder(state.sortBy === 'name-asc' ? 'name-desc' : 'name-asc');
    return;
  }
  if (target.hasAttribute('data-read-story')) { renderSessionStory(); return; }
  if (target.hasAttribute('data-create-summary')) { await startSessionSummary(); return; }
  if (target.hasAttribute('data-create-workspace-summary')) { await startSessionSummary(currentSummaryTarget()); return; }
  if (target.hasAttribute('data-view-summaries')) {
    await openSavedSummaries({ scope: target.dataset.summaryScope, id: target.dataset.summaryTarget, title: target.dataset.summaryTitle });
    return;
  }
  if (target.dataset.openJobLog) { event.preventDefault(); openLogPopup(`/log.html?job=${encodeURIComponent(target.dataset.openJobLog)}`, target.dataset.openJobLog); return; }
  if (target.dataset.tab) { state.tab = target.dataset.tab; renderDetail(); return; }
  if (target.hasAttribute('data-copy-code')) {
    try { await navigator.clipboard.writeText(target.closest('.code-block').querySelector('code').textContent); toast('Code copied to clipboard'); }
    catch (error) { toast(`Could not copy: ${error.message}`); }
    return;
  }
  if (target.id === 'copy-item' && state.detail) {
    const item = state.detail;
    const content = state.tab === 'raw' ? JSON.stringify(item.raw, null, 2) : ['before', 'after'].includes(state.tab) ? item[state.tab] : item.text || JSON.stringify(item.raw, null, 2);
    try { await navigator.clipboard.writeText(content); toast('Item copied to clipboard'); }
    catch (error) { toast(`Could not copy: ${error.message}`); }
  }
  if (target.id === 'browse-prompts' && state.session.requests[0]) selectNode(state.session.requests[0].id);
});
document.addEventListener('toggle', (event) => {
  const details = event.target;
  if (details instanceof HTMLDetailsElement && details.open && details.dataset.storyGroup && !details.dataset.loaded) {
    details.dataset.loaded = 'true';
    mountStory(details.querySelector('.story-stream'), `/api/sessions/${state.session.id}/story?parent=${details.dataset.storyGroup}`, storyVersion);
    return;
  }
  if (!(details instanceof HTMLDetailsElement) || !details.open || !details.dataset.record || details.dataset.loaded) return;
  details.dataset.loaded = 'true';
  details.querySelector('div').innerHTML = renderRecord(records.get(details.dataset.record));
}, true);
$('#back-to-library').addEventListener('click', () => state.workspace ? loadWorkspace(state.workspace.id) : showLibrary());
$('#library-button').addEventListener('click', async () => { await refreshLibrary().catch(() => {}); showLibrary(); });
$('#global-search-button').addEventListener('click', () => { if (state.results) renderResults(); $('#global-search').focus(); $('#global-search').select(); });
$('#global-search-form').addEventListener('submit', (event) => { event.preventDefault(); runGlobalSearch($('#global-search').value); });
$('#search-scope').addEventListener('change', () => { if ($('#global-search').value.trim()) runGlobalSearch($('#global-search').value); });
$('#filters').addEventListener('click', (event) => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  state.filter = button.dataset.filter;
  document.querySelectorAll('.filter').forEach((filter) => filter.classList.toggle('active', filter === button));
  renderTree();
});
$('#search').addEventListener('input', () => {
  clearTimeout(searchTimer);
  const sequence = ++state.searchSequence;
  const value = $('#search').value.trim();
  if (state.mode === 'library') { state.libraryFilter = value; renderLibraryTree(); if (state.view === 'library') renderLibraryPage(); return; }
  state.query = value;
  if (!value) { state.matches.clear(); renderTree(); if (state.session) $('#tree-status').textContent = `${number(state.nodes.size)} recorded items`; return; }
  searchTimer = setTimeout(async () => {
    if (!state.session) return;
    const id = state.session.id;
    try {
      const result = await api(`/api/sessions/${id}/search?q=${encodeURIComponent(value)}`);
      if (sequence !== state.searchSequence || id !== state.session.id) return;
      state.matches = new Set(result.ids);
      renderTree();
      $('#tree-status').textContent = `${number(result.ids.length)} matching items`;
    } catch (error) { toast(error.message); }
  }, 200);
});
$('#tree-scroll').addEventListener('keydown', (event) => {
  const row = event.target.closest('[data-node]');
  if (!row) return;
  const item = state.nodes.get(row.dataset.node);
  const rows = [...$('#tree-scroll').querySelectorAll('[data-node]')];
  const index = rows.indexOf(row);
  let next;
  if (event.key === 'ArrowDown') next = rows[Math.min(index + 1, rows.length - 1)];
  if (event.key === 'ArrowUp') next = rows[Math.max(index - 1, 0)];
  if (event.key === 'Home') next = rows[0];
  if (event.key === 'End') next = rows.at(-1);
  if (event.key === 'ArrowRight' && item.children.length) { state.expanded.add(item.id); renderTree(); next = $('#tree-scroll').querySelector(`[data-node="${item.id}"]`); }
  if (event.key === 'ArrowLeft') {
    if (state.expanded.has(item.id)) { state.expanded.delete(item.id); renderTree(); next = $('#tree-scroll').querySelector(`[data-node="${item.id}"]`); }
    else next = $('#tree-scroll').querySelector(`[data-node="${state.parents.get(item.id)}"]`);
  }
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectNode(item.id); }
  if (next) { event.preventDefault(); next.focus(); next.scrollIntoView({ block: 'nearest' }); }
});
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'f') { event.preventDefault(); $('#global-search').focus(); $('#global-search').select(); return; }
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'o') { event.preventDefault(); openAgentDialog(); return; }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') { event.preventDefault(); openDialog(); return; }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#search').focus(); $('#search').select(); }
});
document.addEventListener('change', (event) => {
  if (event.target.id === 'sidebar-sort' || event.target.id === 'library-page-sort') {
    setSortOrder(event.target.value);
  }
});
let activeTip = null;
function hideTip() {
  activeTip?.removeAttribute('aria-describedby');
  activeTip = null;
  $('#inline-tip-tooltip').hidden = true;
}
function showTip(button) {
  if (!state.tips) return;
  hideTip();
  activeTip = button;
  const tooltip = $('#inline-tip-tooltip');
  tooltip.textContent = button.dataset.tip;
  button.setAttribute('aria-describedby', 'inline-tip-tooltip');
  positionTip();
  requestAnimationFrame(() => { if (activeTip === button) positionTip(); });
}
function positionTip() {
  if (!activeTip?.isConnected) { hideTip(); return; }
  const tooltip = $('#inline-tip-tooltip');
  const bounds = activeTip.getBoundingClientRect();
  const clip = activeTip.closest('.reader-scroll')?.getBoundingClientRect();
  tooltip.hidden = bounds.bottom < Math.max(0, clip?.top || 0) || bounds.top > Math.min(innerHeight, clip?.bottom || innerHeight);
  if (tooltip.hidden) return;
  tooltip.style.left = `${Math.max(8, Math.min(bounds.left, innerWidth - tooltip.offsetWidth - 8))}px`;
  const top = bounds.bottom + tooltip.offsetHeight + 8 < innerHeight ? bounds.bottom + 8 : bounds.top - tooltip.offsetHeight - 8;
  tooltip.style.top = `${Math.max(8, Math.min(top, innerHeight - tooltip.offsetHeight - 8))}px`;
}
document.addEventListener('mouseover', (event) => {
  const button = event.target.closest('.tip-bubble');
  if (button) showTip(button);
  else if (activeTip !== document.activeElement) hideTip();
});
document.addEventListener('focusin', (event) => {
  const button = event.target.closest('.tip-bubble');
  if (button) showTip(button); else hideTip();
});
document.addEventListener('click', (event) => {
  const button = event.target.closest('.tip-bubble');
  if (button) showTip(button); else hideTip();
});
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') hideTip(); });
document.addEventListener('scroll', () => { if (activeTip === document.activeElement) positionTip(); else hideTip(); }, true);
window.addEventListener('resize', hideTip);
$('#tips-toggle').checked = state.tips;
document.body.classList.toggle('tips-off', !state.tips);
$('#tips-toggle').addEventListener('change', () => {
  state.tips = $('#tips-toggle').checked;
  localStorage.setItem('chronicle-tips', state.tips ? 'on' : 'off');
  document.body.classList.toggle('tips-off', !state.tips);
  hideTip();
});
$('#scan-status').addEventListener('click', () => $('#scan-dialog').showModal());
$('#scan-button').addEventListener('click', async () => {
  state.scan = { ...state.scan, running: true, errors: [] };
  renderScanStatus();
  try {
    const result = await api('/api/scan', { method: 'POST' });
    state.scan = { ...result.scan, running: true };
    await refreshLibrary();
  } catch (error) {
    state.scan.running = false;
    renderScanStatus(error.message);
    toast(`Could not scan for updates: ${error.message}`);
  }
});
$('#open-button').addEventListener('click', () => openDialog());
$('#reset-vscode-default').addEventListener('click', () => {
  if (state.defaultPaths.vscodeStorage) setLocationPath(state.defaultPaths.vscodeStorage);
  $('#path-input').focus();
});
$('#reset-agent-default').addEventListener('click', () => {
  if (state.defaultPaths.agentSessions) setLocationPath(state.defaultPaths.agentSessions);
  $('#path-input').focus();
});
$('#config-button').addEventListener('click', () => { pendingSummaryTarget = null; openConfigDialog(); });
$('#help-button').addEventListener('click', () => $('#help-dialog').showModal());
$('#home-button').addEventListener('click', () => state.view === 'workspace' ? loadWorkspace(state.workspace.id) : state.mode === 'session' && renderOverview());
$('#story-button').addEventListener('click', () => state.mode === 'session' && renderSessionStory());
$('#models-button').addEventListener('click', () => {
  if (state.view === 'workspace') { $('.workspace-page .credit-card')?.scrollIntoView({ block: 'start' }); return; }
  if (state.mode === 'session') renderOverview(true);
});
$('#collapse-button').addEventListener('click', () => { state.expanded.clear(); renderTree(); });
$('#expand-button').addEventListener('click', () => { state.session?.requests.forEach((request) => state.expanded.add(request.id)); renderTree(); });
$('#previous-button').addEventListener('click', () => moveSelection(-1));
$('#next-button').addEventListener('click', () => moveSelection(1));
$('#export-button').addEventListener('click', () => {
  if (state.view === 'workspace') {
    const link = document.createElement('a');
    link.href = `/api/workspaces/${state.workspace.id}/export`; link.download = `workspace-${state.workspace.id}-usage.md`; link.click();
    return;
  }
  if (state.mode !== 'session' || !state.session) { toast('Open a session or workspace first'); return; }
  const link = document.createElement('a');
  link.href = `/api/sessions/${state.session.id}/export`; link.download = `chat-${state.session.id}.json`; link.click();
});
$('#theme-button').addEventListener('click', () => { document.body.classList.toggle('light'); localStorage.setItem('chronicle-theme', document.body.classList.contains('light') ? 'light' : 'dark'); });
$('#open-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  $('#import-error').textContent = '';
  $('#import-submit').disabled = true;
  $('#import-submit').textContent = 'Scanning folder...';
  try {
    const result = await api('/api/locations', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paths: locationDraft }) });
    state.locations = result.locations;
    await loadLibrary();
    if (result.errors.length) {
      $('#import-error').textContent = `Locations saved, but some could not be scanned:\n${result.errors.join('\n')}`;
    } else {
      $('#open-dialog').close();
      toast(`Saved ${result.locations.length} scan locations · ${result.sessions.length} sessions.`);
    }
  } catch (error) { $('#import-error').textContent = error.message; }
  finally { $('#import-submit').disabled = false; $('#import-submit').textContent = 'Save and scan'; }
});
$('#path-input').addEventListener('input', resetLocationCheck);
$('#check-location').addEventListener('click', async () => {
  const sequence = ++locationSequence;
  const input = $('#path-input').value.trim();
  $('#import-error').textContent = '';
  checkedLocation = null;
  $('#add-location').disabled = true;
  $('#check-location').disabled = true;
  $('#location-check-result').textContent = 'Checking...';
  try {
    const result = await api('/api/locations/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: input }) });
    if (sequence !== locationSequence) return;
    checkedLocation = result.path;
    $('#path-input').value = result.path;
    $('#location-check-result').textContent = `${result.found} session files found${result.found ? '' : ' (empty location)'}.`;
    $('#add-location').disabled = false;
  } catch (error) { if (sequence === locationSequence) { $('#location-check-result').textContent = ''; $('#import-error').textContent = error.message; } }
  finally { $('#check-location').disabled = false; }
});
$('#add-location').addEventListener('click', () => {
  if (!checkedLocation) return;
  const duplicate = locationDraft.findIndex((input) => input.toLowerCase() === checkedLocation.toLowerCase());
  if (duplicate >= 0 && duplicate !== selectedLocation) { $('#import-error').textContent = 'This location is already listed.'; return; }
  if (selectedLocation < 0) { locationDraft.push(checkedLocation); selectedLocation = locationDraft.length - 1; }
  else locationDraft[selectedLocation] = checkedLocation;
  $('#import-error').textContent = '';
  resetLocationCheck();
  renderLocations();
});
$('#new-location').addEventListener('click', () => { selectedLocation = -1; setLocationPath(''); renderLocations(); $('#path-input').focus(); });
$('#folder-parent').addEventListener('click', () => folderListing && browseLocation(folderListing.parent));
$('#folder-drive').addEventListener('change', () => browseLocation($('#folder-drive').value));
$('#browse-folder').addEventListener('click', async () => {
  if (!window.chronicleDesktop) { await browseLocation(); return; }
  try {
    const chosen = await window.chronicleDesktop.pick('folder', $('#path-input').value.trim());
    if (chosen) setLocationPath(chosen);
  } catch (error) { $('#import-error').textContent = error.message; }
});
const resizeHandle = $('#resize-handle');
function resizeSidebar(width) { document.documentElement.style.setProperty('--sidebar', `${Math.max(250, Math.min(650, width))}px`); }
resizeHandle.addEventListener('pointerdown', (event) => {
  resizeHandle.setPointerCapture(event.pointerId);
  const move = (pointer) => resizeSidebar(pointer.clientX - $('.rail').getBoundingClientRect().width);
  resizeHandle.addEventListener('pointermove', move);
  resizeHandle.addEventListener('pointerup', () => resizeHandle.removeEventListener('pointermove', move), { once: true });
});
resizeHandle.addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  resizeSidebar($('#sidebar').getBoundingClientRect().width + (event.key === 'ArrowRight' ? 20 : -20));
});
if (window.chronicleDesktop) {
  document.body.classList.add('desktop');
  window.chronicleDesktop.onOpen((source) => source === 'agent' ? openAgentDialog() : openDialog());
  for (const [id, kind] of [['#browse-file', 'file']]) {
    $(id).addEventListener('click', async () => {
      try {
        const chosen = await window.chronicleDesktop.pick(kind, $('#path-input').value.trim());
        if (chosen) setLocationPath(chosen);
      } catch (error) { $('#import-error').textContent = error.message; }
    });
  }
  $('#browse-output-dir').addEventListener('click', async () => {
    const chosen = await window.chronicleDesktop.pick('folder');
    if (chosen) $('#cfg-output-dir').value = chosen;
  });
}

function sessionSummaryLinkHtml(sessionId) {
  const job = state.sessionSummaries.get(sessionId);
  if (!job) return '';
  return `<a href="/log.html?job=${encodeURIComponent(job.id)}" class="log-link inline-log-link" data-open-job-log="${escapeHtml(job.id)}" title="Open operation log in popup window">${icon('scroll-text')} ${job.status === 'failed' ? 'Summary failed · View log' : job.status === 'completed' ? 'Summary log' : 'Summarizing · View log'}</a>`;
}

function savedSummaryButtonHtml(scope, id, title) {
  return `<button class="button" data-view-summaries data-summary-scope="${scope}" data-summary-target="${escapeHtml(id)}" data-summary-title="${escapeHtml(title)}" hidden>${icon('book-open')} <span>View summaries</span></button>`;
}

async function refreshSavedSummaryButtons() {
  for (const button of document.querySelectorAll('[data-view-summaries]')) {
    try {
      const summaries = await api(`/api/${button.dataset.summaryScope === 'workspace' ? 'workspaces' : 'sessions'}/${encodeURIComponent(button.dataset.summaryTarget)}/summaries`);
      if (!button.isConnected) continue;
      button.hidden = !summaries.length;
      button.querySelector('span').textContent = `View summaries (${summaries.length})`;
    } catch (error) {
      if (!button.isConnected) continue;
      button.hidden = false;
      button.querySelector('span').textContent = 'Saved summaries unavailable (retry)';
      button.title = error.message;
    }
  }
}

function setSummaryViewerLoading() {
  state.savedSummary = null;
  $('#saved-summary-error').hidden = true;
  $('#saved-summary-feedback').textContent = '';
  $('#saved-summary-content').textContent = 'Loading summary...';
  for (const button of document.querySelectorAll('[data-summary-viewer-action]')) button.disabled = true;
}

async function displaySavedSummary(id) {
  const sequence = ++summaryViewSequence;
  setSummaryViewerLoading();
  try {
    const summary = await api(`/api/summary/saved/${encodeURIComponent(id)}`);
    if (sequence !== summaryViewSequence) return;
    state.savedSummary = summary;
    $('#saved-summary-filename').textContent = summary.fileName;
    $('#saved-summary-filename').title = summary.fileName;
    $('#saved-summary-version').title = summary.fileName;
    $('#saved-summary-content').innerHTML = markdown(summary.markdown);
    $('#saved-summary-content').scrollTop = 0;
    refreshIcons($('#saved-summary-content'));
    for (const button of document.querySelectorAll('[data-summary-viewer-action]')) button.disabled = false;
  } catch (error) {
    if (sequence !== summaryViewSequence) return;
    $('#saved-summary-content').textContent = '';
    $('#saved-summary-error').textContent = error.message;
    $('#saved-summary-error').hidden = false;
  }
}

async function openSavedSummaries(target, selectedId) {
  const sequence = ++summaryViewSequence;
  setSummaryViewerLoading();
  const title = `${target.scope === 'workspace' ? 'Workspace' : 'Session'} summary: ${target.title}`;
  $('#saved-summary-title').textContent = title;
  $('#saved-summary-title').title = title;
  $('#saved-summary-filename').textContent = '';
  $('#saved-summary-filename').title = '';
  const select = $('#saved-summary-version');
  select.replaceChildren();
  select.title = '';
  select.disabled = true;
  if (!$('#saved-summary-dialog').open) $('#saved-summary-dialog').showModal();
  try {
    const summaries = await api(`/api/${target.scope === 'workspace' ? 'workspaces' : 'sessions'}/${encodeURIComponent(target.id)}/summaries`);
    if (sequence !== summaryViewSequence) return;
    if (!summaries.length) {
      $('#saved-summary-content').textContent = 'No saved summaries for this selection yet.';
      return;
    }
    for (const [index, summary] of summaries.entries()) {
      const option = new Option(`${date(summary.generatedAt, { year: 'numeric', second: '2-digit' })} (version ${summaries.length - index})`, summary.id);
      option.title = summary.fileName;
      select.add(option);
    }
    select.disabled = false;
    select.value = summaries.some((summary) => summary.id === selectedId) ? selectedId : summaries[0].id;
    await displaySavedSummary(select.value);
  } catch (error) {
    if (sequence !== summaryViewSequence) return;
    $('#saved-summary-content').textContent = '';
    $('#saved-summary-error').textContent = error.message;
    $('#saved-summary-error').hidden = false;
  }
}

$('#saved-summary-version').addEventListener('change', (event) => displaySavedSummary(event.target.value));
$('#saved-summary-dialog').addEventListener('close', () => {
  summaryViewSequence++;
  state.savedSummary = null;
  clearSummaryPrint();
});
$('#saved-summary-copy').addEventListener('click', async () => {
  if (!state.savedSummary) return;
  try {
    await copyText(state.savedSummary.markdown);
    $('#saved-summary-error').hidden = true;
    $('#saved-summary-feedback').textContent = 'Summary Markdown copied to clipboard.';
  }
  catch (error) { $('#saved-summary-error').textContent = `Could not copy summary: ${error.message}`; $('#saved-summary-error').hidden = false; }
});
$('#saved-summary-save').addEventListener('click', async () => {
  const summary = state.savedSummary;
  if (!summary) return;
  try {
    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        suggestedName: summary.fileName,
        types: [{ description: 'Markdown summary', accept: { 'text/markdown': ['.md'] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(summary.markdown);
      await writable.close();
      $('#saved-summary-feedback').textContent = 'Summary saved.';
    } else {
      const link = document.createElement('a');
      link.href = `/api/summary/saved/${encodeURIComponent(summary.id)}/download`;
      link.download = summary.fileName;
      link.click();
      $('#saved-summary-feedback').textContent = 'Summary download started.';
    }
    $('#saved-summary-error').hidden = true;
  } catch (error) {
    if (error.name === 'AbortError') return;
    $('#saved-summary-error').textContent = `Could not save summary: ${error.message}`;
    $('#saved-summary-error').hidden = false;
  }
});
$('#saved-summary-print').addEventListener('click', () => {
  if (!state.savedSummary) return;
  prepareSummaryPrint();
  window.print();
});
function prepareSummaryPrint() {
  if (!$('#saved-summary-dialog').open || !state.savedSummary) return;
  // A normal-flow copy paginates without the dialog's top-layer clipping.
  $('#summary-print-document').innerHTML = $('#saved-summary-content').innerHTML;
  document.body.classList.add('printing-summary');
}
function clearSummaryPrint() {
  document.body.classList.remove('printing-summary');
  $('#summary-print-document').replaceChildren();
}
window.addEventListener('beforeprint', prepareSummaryPrint);
window.addEventListener('afterprint', clearSummaryPrint);
$('#summary-view-button').addEventListener('click', () => {
  const job = state.activeSummaryJob;
  if (!job?.savedSummaryId) return;
  $('#summary-progress-dialog').close();
  openSavedSummaries({ scope: job.scope, id: job.sessionId, title: job.sessionTitle }, job.savedSummaryId);
});

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return; }
    catch { /* fall back */ }
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  const container = document.activeElement?.closest('dialog[open]') || document.querySelector('dialog[open]') || document.body;
  container.append(area);
  area.select();
  const ok = document.execCommand('copy');
  area.remove();
  if (!ok) throw new Error('Clipboard access denied');
}

async function loadSummaryConfig() {
  const cfg = await api('/api/summary/config');
  state.summaryConfig = cfg;
  $('#config-status-dot').hidden = !cfg.configured;
  return cfg;
}

function setConfigFeedback(kind, message) {
  const box = $('#config-feedback');
  if (!message) { box.hidden = true; box.textContent = ''; box.className = 'config-feedback'; return; }
  box.hidden = false;
  box.className = `config-feedback ${kind}`;
  box.textContent = message;
}

function readConfigFormValues() {
  return {
    tenantId: $('#cfg-tenant-id').value.trim(),
    clientId: $('#cfg-client-id').value.trim(),
    clientSecret: $('#cfg-client-secret').value,
    agentEndpoint: $('#cfg-agent-endpoint').value.trim(),
    agentName: $('#cfg-agent-name').value.trim(),
    outputDir: $('#cfg-output-dir').value.trim()
  };
}

function syncSecretFieldState(hasSecret) {
  $('#cfg-client-secret').value = '';
  $('#cfg-client-secret').required = !hasSecret;
  $('#cfg-client-secret').placeholder = hasSecret ? '•••••••••••• (saved in .env · enter new secret to replace)' : 'Enter Entra ID client secret value';
  $('#cfg-secret-hint').textContent = hasSecret ? '(saved in .env)' : '(required)';
}

async function openConfigDialog({ requiredForSummary = false } = {}) {
  setConfigFeedback('', '');
  $('#config-test-log-wrap').hidden = true;
  $('#config-required-banner').hidden = !requiredForSummary;
  $('#continue-summary-button').hidden = true;
  try {
    const cfg = await loadSummaryConfig();
    $('#cfg-tenant-id').value = cfg.tenantId || '';
    $('#cfg-client-id').value = cfg.clientId || '';
    $('#cfg-agent-endpoint').value = cfg.agentEndpoint || '';
    $('#cfg-agent-name').value = cfg.agentName || '';
    $('#cfg-output-dir').value = cfg.outputDir || '';
    syncSecretFieldState(cfg.hasClientSecret);
    const testedNote = cfg.lastTestedAt ? ` · Tested ${date(cfg.lastTestedAt)}` : '';
    $('#cfg-env-path').innerHTML = `${icon('file-lock-2')} <span>Saved to <code>.env</code>${escapeHtml(testedNote)}</span>`;
    $('#cfg-env-path').title = cfg.envPath || '.env';
  } catch (error) {
    setConfigFeedback('error', error.message);
  }
  refreshIcons($('#config-dialog'));
  if (!$('#config-dialog').open) $('#config-dialog').showModal();
  ($('#cfg-tenant-id').value ? $('#cfg-agent-endpoint') : $('#cfg-tenant-id')).focus();
}

$('#config-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  setConfigFeedback('', '');
  const submitBtn = $('#save-config-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';
  try {
    const cfg = await api('/api/summary/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(readConfigFormValues())
    });
    state.summaryConfig = cfg;
    $('#config-status-dot').hidden = !cfg.configured;
    syncSecretFieldState(cfg.hasClientSecret);
    $('#config-required-banner').hidden = true;
    $('#cfg-env-path').innerHTML = `${icon('file-lock-2')} <span>Saved to <code>.env</code></span>`;
    $('#cfg-env-path').title = cfg.envPath || '.env';
    setConfigFeedback('success', 'Configuration saved to local .env file. Run Test connection to verify connectivity.');
    if (pendingSummaryTarget) {
      $('#continue-summary-button').hidden = false;
    }
    toast('Summary configuration saved to .env');
  } catch (error) {
    setConfigFeedback('error', error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `${icon('save')} Save to .env`;
    refreshIcons($('#config-dialog'));
  }
});

$('#test-config-button').addEventListener('click', async () => {
  setConfigFeedback('info', 'Testing Microsoft Entra ID token and Foundry Agent endpoint...');
  $('#config-test-log-wrap').hidden = true;
  const btn = $('#test-config-button');
  btn.disabled = true;
  btn.textContent = 'Testing...';
  try {
    const result = await api('/api/summary/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(readConfigFormValues())
    });
    const testId = String(Date.now());
    try { localStorage.setItem(`chronicle-test-log-${testId}`, JSON.stringify(result)); } catch { /* quota */ }
    $('#config-test-log-link').href = `/log.html?test=${encodeURIComponent(testId)}`;
    $('#config-test-log-link').dataset.testId = testId;
    $('#config-test-log-wrap').hidden = false;
    if (result.ok) {
      await loadSummaryConfig().catch(() => {});
      setConfigFeedback('success', `Connectivity verified! Entra auth ${result.authMs} ms · Foundry agent ${result.agentMs} ms · Reply: "${result.replyPreview}"`);
      if (pendingSummaryTarget && state.summaryConfig?.configured) {
        $('#continue-summary-button').hidden = false;
      }
    } else {
      setConfigFeedback('error', result.error || 'Connectivity test failed.');
    }
  } catch (error) {
    setConfigFeedback('error', error.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `${icon('plug-zap')} Test connection`;
    refreshIcons($('#config-dialog'));
  }
});

$('#continue-summary-button').addEventListener('click', async () => {
  $('#config-dialog').close();
  const target = pendingSummaryTarget;
  pendingSummaryTarget = null;
  await startSessionSummary(target);
});

function formatPlainLogs(job) {
  const lines = [
    `Session: ${job.sessionTitle || ''}`,
    `Output: ${job.outputPath || job.fileName || ''}`,
    `Status: ${String(job.status || '').toUpperCase()}`,
    '----------------------------------------'
  ];
  for (const entry of job.logs || []) {
    lines.push(`[${entry.timestamp}] [${String(entry.level || 'info').toUpperCase()}] [${entry.step || 'op'}] ${entry.message}`);
  }
  return lines.join('\n');
}

let fallbackLogData = null;
function openFallbackLogDialog(title, logs, headerText) {
  fallbackLogData = { title, logs: logs || [], headerText };
  $('#fallback-log-title').textContent = title || 'Operation log';
  $('#fallback-log-count').textContent = `${fallbackLogData.logs.length} ${fallbackLogData.logs.length === 1 ? 'entry' : 'entries'}`;
  $('#fallback-log-entries').innerHTML = fallbackLogData.logs.length
    ? `<div class="log-table">${fallbackLogData.logs.map((entry) => {
      const level = String(entry.level || 'info').toLowerCase();
      return `<div class="log-row log-${escapeHtml(level)}"><span class="log-time">${escapeHtml((entry.timestamp || '').replace('T', ' ').replace('Z', ''))}</span><span class="log-level ${escapeHtml(level)}">${escapeHtml(level.toUpperCase())}</span><span class="log-step">${escapeHtml(entry.step || 'op')}</span><span class="log-msg">${escapeHtml(entry.message)}</span></div>`;
    }).join('')}</div>`
    : '<div class="empty-state">No log entries recorded.</div>';
  if (!$('#summary-log-dialog').open) $('#summary-log-dialog').showModal();
}

$('#fallback-copy-log').addEventListener('click', async () => {
  if (!fallbackLogData) return;
  try {
    const lines = [fallbackLogData.headerText || fallbackLogData.title, '----------------------------------------'];
    for (const entry of fallbackLogData.logs) {
      lines.push(`[${entry.timestamp}] [${String(entry.level || 'info').toUpperCase()}] [${entry.step || 'op'}] ${entry.message}`);
    }
    await copyText(lines.join('\n'));
    toast('Operation log copied to clipboard');
  } catch (error) { toast(`Could not copy log: ${error.message}`); }
});

function openLogPopup(url, jobId = null, testId = null) {
  const popup = window.open(url, 'chronicleSummaryLog', 'popup=yes,width=880,height=660');
  if (popup) {
    popup.focus?.();
    return;
  }
  // Graceful modal fallback when browser blocks popups
  if (jobId && state.activeSummaryJob?.id === jobId) {
    openFallbackLogDialog(state.activeSummaryJob.sessionTitle, state.activeSummaryJob.logs, formatPlainLogs(state.activeSummaryJob).split('\n----------------------------------------')[0]);
  } else if (jobId) {
    api(`/api/summary/jobs/${encodeURIComponent(jobId)}`).then((job) => {
      openFallbackLogDialog(job.sessionTitle, job.logs, `Session: ${job.sessionTitle}\nOutput: ${job.outputPath}\nStatus: ${job.status}`);
    }).catch((error) => toast(error.message));
  } else if (testId) {
    try {
      const parsed = JSON.parse(localStorage.getItem(`chronicle-test-log-${testId}`) || '{}');
      openFallbackLogDialog('Connectivity test log', parsed.logs || [], 'Chronicle Connectivity Test');
    } catch { toast('Log popup was blocked by the browser.'); }
  }
}

$('#summary-log-link').addEventListener('click', (event) => {
  event.preventDefault();
  const jobId = $('#summary-log-link').dataset.jobId;
  if (jobId) openLogPopup(`/log.html?job=${encodeURIComponent(jobId)}`, jobId);
});

$('#config-test-log-link').addEventListener('click', (event) => {
  event.preventDefault();
  const testId = $('#config-test-log-link').dataset.testId;
  if (testId) openLogPopup(`/log.html?test=${encodeURIComponent(testId)}`, null, testId);
});

$('#summary-copy-button').addEventListener('click', async () => {
  const markdownText = state.activeSummaryJob?.markdown;
  if (!markdownText) return;
  try {
    await copyText(markdownText);
    toast('Session summary copied to clipboard');
  } catch (error) { toast(`Could not copy summary: ${error.message}`); }
});

function renderSummaryJobDialog(job) {
  state.activeSummaryJob = job;
  state.sessionSummaries.set(job.scope === 'workspace' ? `workspace:${job.sessionId}` : job.sessionId, job);
  const elapsed = (((job.completedAt || Date.now()) - job.startedAt) / 1000).toFixed(1);
  $('#summary-progress-elapsed').textContent = `${elapsed} s`;
  $('#summary-progress-fill').style.width = `${Math.max(5, Math.min(100, job.progress || 0))}%`;
  $('#summary-log-link').href = `/log.html?job=${encodeURIComponent(job.id)}`;
  $('#summary-log-link').dataset.jobId = job.id;
  $('#summary-view-button').hidden = job.status !== 'completed' || !job.savedSummaryId;

  if (job.stats) {
    $('#summary-progress-stats').hidden = false;
    $('#summary-progress-stats').innerHTML = [
      ...(job.stats.sessions ? [`${number(job.stats.sessions)} sessions`] : []),
      `${number(job.stats.prompts)} prompts`,
      `${number(job.stats.tools)} tool calls`,
      `${number(job.stats.reasoning)} reasoning`,
      `${number(job.stats.edits)} edits`,
      `~${number(job.stats.approxInputTokens)} input tokens`,
      job.stats.chunks > 1 ? `${number(job.stats.chunks)} chunks` : '1 pass'
    ].map((label) => `<span class="badge">${escapeHtml(label)}</span>`).join('');
  } else {
    $('#summary-progress-stats').hidden = true;
  }

  if (job.status === 'running') {
    $('#summary-dialog-title').textContent = `Creating ${job.scope === 'workspace' ? 'workspace' : 'session'} summary...`;
    $('#summary-dialog-subtitle').textContent = `Generating ${job.fileName} via Microsoft Foundry Agent.`;
    $('#summary-progress-status').innerHTML = `<span class="spinner inline-spinner"></span> ${escapeHtml(job.message || 'Working...')}`;
    $('#summary-progress-error').hidden = true;
    $('#summary-saved-path').hidden = true;
    $('#summary-copy-button').hidden = true;
    $('#summary-download-link').hidden = true;
  } else if (job.status === 'completed') {
    $('#summary-dialog-title').textContent = `${job.scope === 'workspace' ? 'Workspace' : 'Session'} summary created.`;
    $('#summary-dialog-subtitle').textContent = job.fileName;
    $('#summary-progress-status').innerHTML = `${icon('circle-check')} Summary completed${job.warningCount ? ` with ${number(job.warningCount)} warning(s)` : ''}.`;
    $('#summary-progress-error').hidden = true;
    $('#summary-saved-path').hidden = false;
    $('#summary-saved-path').textContent = job.outputPath;
    $('#summary-download-link').hidden = false;
    $('#summary-download-link').href = `/api/summary/jobs/${encodeURIComponent(job.id)}/download`;
    $('#summary-download-link').download = job.fileName;
    $('#summary-copy-button').hidden = !job.markdown;
    if (state.mode === 'session' && state.session?.id === job.sessionId && state.selected === state.session.overview.id && !$('#models-button').classList.contains('active')) {
      renderOverview(false);
    }
    if (job.status !== 'running' && job.scope === 'workspace' && state.view === 'workspace' && state.workspace?.id === job.sessionId) {
      loadWorkspace(job.sessionId, false);
    }
  } else if (job.status === 'failed') {
    $('#summary-dialog-title').textContent = 'Summary generation failed.';
    $('#summary-dialog-subtitle').textContent = `A problem occurred while creating ${job.fileName}. Inspect the operation log for full details.`;
    $('#summary-progress-status').innerHTML = `${icon('triangle-alert')} Operation stopped with an error.`;
    $('#summary-progress-error').hidden = false;
    $('#summary-progress-error').textContent = job.error || 'Unknown error.';
    $('#summary-saved-path').hidden = true;
    $('#summary-copy-button').hidden = true;
    $('#summary-download-link').hidden = true;
    if (state.mode === 'session' && state.session?.id === job.sessionId && state.selected === state.session.overview.id && !$('#models-button').classList.contains('active')) {
      renderOverview(false);
    }
  }
  refreshIcons($('#summary-progress-dialog'));
}

async function pollSummaryJob(jobId) {
  clearTimeout(summaryPollTimer);
  try {
    const job = await api(`/api/summary/jobs/${encodeURIComponent(jobId)}?markdown=1`);
    renderSummaryJobDialog(job);
    if (job.status === 'running') {
      summaryPollTimer = setTimeout(() => pollSummaryJob(jobId), 400);
    } else if (job.status === 'completed') {
      toast(`Saved ${job.fileName}`);
    }
  } catch (error) {
    $('#summary-progress-error').hidden = false;
    $('#summary-progress-error').textContent = error.message;
  }
}

function currentSummaryTarget() {
  if (state.view === 'workspace') return { scope: 'workspace', id: state.workspace.id, title: state.workspace.title };
  if (state.mode === 'session' && state.session) return { scope: 'session', id: state.session.id, title: state.session.title };
  return null;
}
async function startSessionSummary(target = currentSummaryTarget()) {
  if (!target) { toast('Select a session or workspace first'); return; }
  let cfg;
  try { cfg = await loadSummaryConfig(); }
  catch (error) { toast(error.message); return; }

  if (!cfg.configured) {
    pendingSummaryTarget = target;
    await openConfigDialog({ requiredForSummary: true });
    return;
  }

  clearTimeout(summaryPollTimer);
  $('#summary-progress-error').hidden = true;
  $('#summary-saved-path').hidden = true;
  $('#summary-copy-button').hidden = true;
  $('#summary-download-link').hidden = true;
  $('#summary-progress-stats').hidden = true;
  $('#summary-progress-fill').style.width = '5%';
  $('#summary-dialog-title').textContent = `Creating ${target.scope} summary...`;
  $('#summary-view-button').hidden = true;
  $('#summary-dialog-subtitle').textContent = `Starting summarization for “${target.title}”...`;
  $('#summary-progress-status').innerHTML = '<span class="spinner inline-spinner"></span> Preparing session digest...';
  $('#summary-progress-elapsed').textContent = '0.0 s';
  if (!$('#summary-progress-dialog').open) $('#summary-progress-dialog').showModal();

  try {
    const job = await api(`/api/${target.scope === 'workspace' ? 'workspaces' : 'sessions'}/${encodeURIComponent(target.id)}/summarize`, { method: 'POST' });
    renderSummaryJobDialog(job);
    summaryPollTimer = setTimeout(() => pollSummaryJob(job.id), 300);
  } catch (error) {
    $('#summary-dialog-title').textContent = 'Could not start summary.';
    $('#summary-progress-status').innerHTML = `${icon('triangle-alert')} Failed to start operation.`;
    $('#summary-progress-error').hidden = false;
    $('#summary-progress-error').textContent = error.message;
    refreshIcons($('#summary-progress-dialog'));
  }
}

loadSummaryConfig().catch(() => {});
if (localStorage.getItem('chronicle-theme') === 'light') document.body.classList.add('light');
refreshIcons();
loadLibrary().catch((error) => {
  $('#reader').innerHTML = `<div class="empty-state">${icon('triangle-alert')}<h2>Could not open the library.</h2><p>${escapeHtml(error.message)}</p><button class="button primary" data-open>Open a session</button></div>`;
  $('#tree-scroll').innerHTML = '<div class="empty-state">Library unavailable.</div>';
  refreshIcons();
});
window.addEventListener('chronicle:recovered', () => toast('The background reader restarted after running out of resources. Your library is safe.'));
