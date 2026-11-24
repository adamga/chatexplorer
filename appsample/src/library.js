import path from 'node:path';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdir, readdir, readFile, writeFile, rename, stat } from 'node:fs/promises';
import { discover, loadSession, sessionKey } from './parser.js';
import { workspaceIdentity, workspaceOverview } from './workspaces.js';

const CACHE_VERSION = 4;
const pricingFile = path.join(path.dirname(fileURLToPath(import.meta.url)), 'copilot-pricing.json');
const indexerPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'indexer.js');
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function signatureOf(file) {
  if (path.basename(file).toLowerCase() === 'events.jsonl') {
    const sessionDir = path.dirname(file);
    const parts = [
      file,
      path.join(sessionDir, 'workspace.yaml'),
      path.join(sessionDir, 'vscode.metadata.json'),
      path.join(sessionDir, 'plan.md'),
      pricingFile
    ];
    try {
      const checkpoints = path.join(sessionDir, 'checkpoints');
      const names = await readdir(checkpoints);
      parts.push(...names.filter((name) => /\.md$/i.test(name)).sort().map((name) => path.join(checkpoints, name)));
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const stats = await Promise.all(parts.map((part) => stat(part).catch(() => null)));
    if (!stats[0]?.isFile()) throw new Error('Session file is missing.');
    return { size: stats[0].size, signature: stats.map((info) => info ? `${info.size}:${info.mtimeMs}` : '-').join('|') };
  }
  const name = path.basename(file).replace(/\.(jsonl|json)$/i, '');
  const root = path.basename(path.dirname(file)).toLowerCase() === 'chatsessions' ? path.dirname(path.dirname(file)) : path.dirname(file);
  const parts = [file,
    path.join(root, 'GitHub.copilot-chat', 'transcripts', name + '.jsonl'),
    path.join(root, 'GitHub.copilot-chat', 'debug-logs', name, 'main.jsonl'),
    path.join(root, 'GitHub.copilot-chat', 'debug-logs', name, 'models.json'),
    path.join(root, 'chatEditingSessions', name, 'state.json'),
    path.join(root, 'workspace.json'), pricingFile];
  const stats = await Promise.all(parts.map((part) => stat(part).catch(() => null)));
  if (!stats[0]?.isFile()) throw new Error('Session file is missing.');
  return { size: stats[0].size, signature: stats.map((info) => info ? `${info.size}:${info.mtimeMs}` : '-').join('|') };
}

function placeholder(entry) {
  const isAgentEvents = path.basename(entry.file).toLowerCase() === 'events.jsonl';
  if (isAgentEvents) {
    const sessionId = path.basename(path.dirname(entry.file));
    return {
      id: entry.id, sessionId, sessionFormat: 'agent-host', clientName: 'copilot-agent',
      title: sessionId, file: entry.file, size: entry.size,
      workspaceName: 'Agent sessions', workspacePath: '', stats: null, warnings: [], modelTimeline: [], sources: {}
    };
  }
  const name = path.basename(entry.file);
  const workspaceDir = path.basename(path.dirname(path.dirname(entry.file)));
  return { id: entry.id, sessionId: name.replace(/\.(jsonl|json)$/i, ''), sessionFormat: 'vscode-chat', clientName: 'vscode-chat', title: name, file: entry.file, size: entry.size,
    workspaceName: workspaceDir, workspacePath: '', stats: null, warnings: [], modelTimeline: [], sources: {} };
}

export function createLibrary({ cacheDir, maxLoadedBytes = 700_000_000, indexerArgs = ['--max-old-space-size=8192'] } = {}) {
  const entries = new Map();
  const loaded = new Map();
  const loading = new Map();
  const roots = new Map();
  const queue = [];
  let worker = null;
  let current = null;
  let done = 0;
  let total = 0;
  let pump = null;

  async function readCache(entry) {
    if (!cacheDir) return false;
    try {
      const cached = JSON.parse(await readFile(path.join(cacheDir, entry.id + '.json'), 'utf8'));
      if (cached.version !== CACHE_VERSION || cached.signature !== entry.signature) return false;
      Object.assign(entry, { summary: cached.summary, corpus: cached.corpus, error: cached.error, status: cached.error ? 'error' : 'ready' });
      return true;
    } catch { return false; }
  }
  async function writeCache(entry) {
    if (!cacheDir) return;
    try {
      await mkdir(cacheDir, { recursive: true });
      const target = path.join(cacheDir, entry.id + '.json');
      const temporary = `${target}.${process.pid}.tmp`;
      await writeFile(temporary, JSON.stringify({ version: CACHE_VERSION, signature: entry.signature, summary: entry.summary, corpus: entry.corpus, error: entry.error }));
      await rename(temporary, target);
    } catch (error) { console.warn(`Index cache: ${error.message}`); }
  }

  function startWorker() {
    // ELECTRON_RUN_AS_NODE lets the same binary run the indexer as plain Node inside the desktop app.
    const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1' };
    delete env.WATCH_REPORT_DEPENDENCIES;
    const child = fork(indexerPath, [], { execArgv: indexerArgs, env, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-2000); });
    const ready = new Promise((resolve, reject) => {
      child.on('message', (message) => { if (message?.ready) resolve(); });
      child.once('error', reject);
      child.once('exit', () => reject(new Error(stderr.trim().split('\n').at(-1) || 'Indexer exited during startup.')));
    });
    worker = { child, ready, pending: null, stderr: () => stderr };
    child.on('message', (message) => {
      if (worker?.child === child && worker.pending && message.id === worker.pending.id) { worker.pending.resolve(message); worker.pending = null; }
    });
    child.on('exit', (code, signal) => {
      if (worker?.child !== child) return;
      const pending = worker.pending;
      worker = null;
      const detail = stderr.includes('heap out of memory') ? 'ran out of memory' : `stopped (${signal || code})`;
      pending?.resolve({ id: pending.id, error: `Indexer ${detail} while reading this session.` });
    });
    child.unref();
    child.channel?.unref?.();
    return worker;
  }
  async function indexInWorker(entry) {
    const active = worker || startWorker();
    await active.ready;
    active.child.ref();
    active.child.channel?.ref?.();
    try {
      return await new Promise((resolve) => {
        active.pending = { id: entry.id, resolve };
        active.child.send({ id: entry.id, file: entry.file });
      });
    } finally {
      active.child.unref();
      active.child.channel?.unref?.();
    }
  }

  function runQueue() {
    if (pump) return pump;
    pump = (async () => {
      while (queue.length) {
        const entry = queue.shift();
        if (entries.get(entry.id) !== entry) { done++; continue; }
        current = entry;
        try {
          const result = await indexInWorker(entry);
          if (result.error) Object.assign(entry, { status: 'error', error: result.error, summary: null, corpus: null });
          else Object.assign(entry, { status: 'ready', error: null, summary: result.summary, corpus: result.corpus });
        } catch (error) { Object.assign(entry, { status: 'error', error: error.message }); }
        if (entries.get(entry.id) === entry) await writeCache(entry);
        done++;
      }
      current = null;
      pump = null;
      if (worker) { worker.child.kill(); worker = null; }
    })();
    return pump;
  }

  async function addPath(input, { allowEmpty = false, retryErrors = false } = {}) {
    const files = await discover(input, { allowEmpty });
    const inspected = [];
    for (const file of files) {
      try { inspected.push([file, await signatureOf(file)]); }
      catch (error) { throw new Error(`Could not inspect ${file}: ${error.message}`); }
    }
    roots.set(path.resolve(input), new Set(files.map(sessionKey)));
    const added = [];
    const fresh = [];
    for (const [file, info] of inspected) {
      const id = sessionKey(file);
      let entry = entries.get(id);
      if (entry && entry.signature === info.signature && !(retryErrors && entry.status === 'error')) { added.push(id); continue; }
      entry = { id, file, ...info, status: 'pending', summary: null, corpus: null, error: null };
      entries.set(id, entry);
      loaded.delete(id);
      loading.delete(id);
      added.push(id);
      if (!(await readCache(entry)) || (retryErrors && entry.status === 'error')) {
        entry.status = 'pending'; entry.error = null;
        fresh.push(entry);
      }
    }
    // Small sessions first, so most of the library becomes searchable quickly.
    fresh.sort((a, b) => a.size - b.size);
    if (!queue.length && !current) { done = 0; total = 0; }
    queue.push(...fresh);
    total += fresh.length;
    if (fresh.length) runQueue();
    return { found: files.length, sessions: added, indexing: fresh.length };
  }

  function list() {
    const sessions = [];
    let empty = 0;
    for (const entry of entries.values()) {
      if (entry.status === 'ready' && entry.summary?.stats?.prompts === 0) { empty++; continue; }
      const summary = entry.summary || placeholder(entry);
      sessions.push({ ...summary, workspaceId: workspaceIdentity(summary), status: entry.status, error: entry.error || undefined, size: entry.size });
    }
    return { sessions, empty, indexing: { done, total, active: !!current, current: current ? path.basename(current.file) : null } };
  }

  function evict(keep) {
    let bytes = [...loaded.values()].reduce((sum, item) => sum + item.size, 0);
    for (const [id, item] of loaded) {
      if (bytes <= maxLoadedBytes || loaded.size <= 1) break;
      if (id === keep) continue;
      loaded.delete(id);
      bytes -= item.size;
    }
  }
  async function getSession(id) {
    const entry = entries.get(id);
    if (!entry) { const error = new Error('Session not found.'); error.status = 404; throw error; }
    const hit = loaded.get(id);
    if (hit) { loaded.delete(id); loaded.set(id, hit); return hit.session; }
    if (!loading.has(id)) {
      // Release older sessions before parsing a new one so peak memory stays bounded.
      if (entry.size > maxLoadedBytes / 2) loaded.clear(); else evict(id);
      loading.set(id, loadSession(entry.file).then((session) => {
        if (entries.get(id) === entry) {
          loaded.set(id, { session, size: entry.size });
          evict(id);
        }
        return session;
      }).finally(() => { if (entries.get(id) === entry || !entries.has(id)) loading.delete(id); }));
    }
    return loading.get(id);
  }

  function search(query, { session: scope, limit = 200 } = {}) {
    const terms = String(query || '').trim().split(/\s+/).filter(Boolean).slice(0, 8);
    if (!terms.length) return { results: [], counts: {}, total: 0, truncated: false };
    const patterns = terms.map((term) => new RegExp(escapeRegExp(term), 'i'));
    const results = [];
    const counts = {};
    let totalHits = 0;
    for (const entry of entries.values()) {
      if (scope && entry.id !== scope) continue;
      if (!entry.corpus) continue;
      for (const [nodeId, kind, promptIndex, text] of entry.corpus) {
        if (!patterns.every((pattern) => pattern.test(text))) continue;
        totalHits++;
        counts[entry.id] = (counts[entry.id] || 0) + 1;
        if (results.length >= limit) continue;
        const match = patterns[0].exec(text);
        const start = Math.max(0, match.index - 60);
        const end = Math.min(text.length, match.index + match[0].length + 100);
        results.push({
          sessionId: entry.id, sessionTitle: entry.summary?.title || path.basename(entry.file), workspaceName: entry.summary?.workspaceName || '',
          nodeId, kind, promptIndex, timestamp: entry.summary?.lastAt,
          snippet: `${start ? '…' : ''}${text.slice(start, end).replace(/\s+/g, ' ')}${end < text.length ? '…' : ''}`
        });
      }
    }
    return { results, counts, total: totalHits, truncated: totalHits > results.length, terms,
      pending: [...entries.values()].filter((entry) => !entry.corpus && entry.status === 'pending' && (!scope || entry.id === scope)).length };
  }

  const idle = () => pump || Promise.resolve();
  function retainPaths(paths) {
    const keep = new Set(paths.map((input) => path.resolve(input)));
    for (const root of roots.keys()) if (!keep.has(root)) roots.delete(root);
    const ids = new Set([...roots.values()].flatMap((set) => [...set]));
    for (const id of entries.keys()) {
      if (ids.has(id)) continue;
      entries.delete(id);
      loaded.delete(id);
      loading.delete(id);
    }
    for (let index = queue.length - 1; index >= 0; index--) {
      if (!entries.has(queue[index].id)) { queue.splice(index, 1); total--; }
    }
  }
  const close = () => { queue.length = 0; worker?.child.kill(); worker = null; };
  return { addPath, retainPaths, list, getSession, search, idle, close,
    getWorkspace: (id) => workspaceOverview(id, list().sessions),
    has: (id) => entries.has(id), get size() { return entries.size; } };
}
