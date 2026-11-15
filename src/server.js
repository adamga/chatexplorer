import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, rename, readdir } from 'node:fs/promises';
import { summarizeSession, summarizeNode, detailNodeAsync, storyPage } from './parser.js';
import { createLibrary } from './library.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let configFile = path.join(projectRoot, '.chat-explorer.json');
const app = express();
const imports = new Set();
const startupWarnings = [];
let saveQueue = Promise.resolve();
app.disable('x-powered-by');
app.use((req, res, next) => {
  const host = req.headers.host;
  if (!host || !/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) return res.status(403).json({ error: 'Local requests only.' });
  if ((req.headers.origin && ![`http://${host}`].includes(req.headers.origin)) || req.headers['sec-fetch-site'] === 'cross-site') {
    return res.status(403).json({ error: 'Cross-origin access is not allowed.' });
  }
  res.set({
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    'Cache-Control': 'no-store'
  });
  next();
});
app.use(express.json({ limit: '32kb' }));

let library = null;
async function importPath(input, persist = true) {
  const result = await library.addPath(input);
  if (persist) {
    imports.add(path.resolve(input));
    const content = JSON.stringify({ paths: [...imports] }, null, 2);
    const save = saveQueue.catch(() => {}).then(async () => {
      const temporary = `${configFile}.${process.pid}.tmp`;
      await writeFile(temporary, content, { mode: 0o600 });
      await rename(temporary, configFile);
    });
    saveQueue = save;
    await save;
  }
  return result;
}
const sessionOf = (req) => library.getSession(req.params.id);
app.get('/api/sessions', (_req, res) => res.json({ ...library.list(), warnings: startupWarnings }));
app.post('/api/import', async (req, res) => {
  if (typeof req.body?.path !== 'string' || !req.body.path.trim()) return res.status(400).json({ error: 'A local path is required.' });
  res.json(await importPath(req.body.path.trim()));
});
app.get('/api/search', (req, res) => {
  const query = String(req.query.q || '').slice(0, 200);
  res.json(library.search(query, { session: req.query.session ? String(req.query.session) : undefined }));
});
app.get('/api/sessions/:id', async (req, res) => {
  const session = await sessionOf(req);
  res.json({ ...summarizeSession(session), overview: summarizeNode(session.overview), requests: session.requests.map(summarizeNode) });
});
app.get('/api/sessions/:id/nodes/:nodeId', async (req, res) => {
  const session = await sessionOf(req);
  const item = session.nodes.get(req.params.nodeId);
  if (!item) return res.status(404).json({ error: 'Item not found.' });
  res.json(await detailNodeAsync(session, item));
});
app.get('/api/sessions/:id/story', async (req, res) => {
  res.json(storyPage(await sessionOf(req), {
    parentId: req.query.parent,
    offset: Number(req.query.offset || 0),
    limit: Number(req.query.limit || 16)
  }));
});
app.get('/api/sessions/:id/search', async (req, res) => {
  const query = String(req.query.q || '').toLowerCase().trim();
  const session = await sessionOf(req);
  res.json({ ids: query ? [...session.nodes.values()].filter((item) => item.searchText.includes(query)).map((item) => item.id) : [] });
});
app.get('/api/sessions/:id/export', async (req, res) => {
  const session = await sessionOf(req);
  res.attachment(`chat-${session.id}.json`).json(session.raw);
});app.use('/vendor/marked', express.static(path.join(projectRoot, 'node_modules', 'marked', 'lib')));
app.use('/vendor/dompurify', express.static(path.join(projectRoot, 'node_modules', 'dompurify', 'dist')));
app.use('/vendor/highlight', express.static(path.join(projectRoot, 'node_modules', '@highlightjs', 'cdn-assets')));
app.use('/vendor/lucide', express.static(path.join(projectRoot, 'node_modules', 'lucide', 'dist', 'umd')));
app.use('/vendor/font', express.static(path.join(projectRoot, 'node_modules', '@fontsource-variable', 'inter')));
app.use(express.static(path.join(projectRoot, 'public')));
app.use((error, _req, res, _next) => {
  console.error(error.message);
  res.status(error.status || 400).json({ error: error.message });
});

export async function startServer({ port = 3210, dataDir, loadSamples = true, paths = [] } = {}) {
  if (dataDir) configFile = path.join(dataDir, 'settings.json');
  library = createLibrary({ cacheDir: path.join(dataDir || path.join(projectRoot, '.chat-explorer-cache'), dataDir ? 'index-cache' : '') });
  try {
    const config = JSON.parse(await readFile(configFile, 'utf8'));
    for (const input of config.paths || []) {
      imports.add(input);
      try { await importPath(input, false); } catch (error) { startupWarnings.push(`${input}: ${error.message}`); }
    }
  } catch (error) { if (error.code !== 'ENOENT') startupWarnings.push(`Saved library: ${error.message}`); }
  if (!library.size && loadSamples) {
    try {
      const samples = await readdir(path.join(projectRoot, 'chatsessions'), { withFileTypes: true });
      for (const entry of samples.filter((value) => value.isDirectory())) {
        try { await importPath(path.join(projectRoot, 'chatsessions', entry.name), false); }
        catch (error) { startupWarnings.push(`${entry.name}: ${error.message}`); }
      }
    } catch (error) { if (error.code !== 'ENOENT') startupWarnings.push(error.message); }
  }
  for (const input of paths) {
    try { await importPath(input); } catch (error) { startupWarnings.push(`${input}: ${error.message}`); }
  }
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT must be an integer from 0 to 65535.');
  const server = await new Promise((resolve, reject) => {
    const listener = app.listen(port, '127.0.0.1', () => resolve(listener));
    listener.once('error', reject);
  });
  const actual = server.address().port;
  return { server, port: actual, url: `http://127.0.0.1:${actual}`, sessionCount: library.size, warnings: startupWarnings, importPath, library };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const input = process.argv.indexOf('--path');
  if (input >= 0 && !process.argv[input + 1]) { console.error('--path requires a folder or file.'); process.exit(1); }
  startServer({ port: Number(process.env.PORT || 3210), dataDir: process.env.CHRONICLE_DATA_DIR || undefined, paths: input >= 0 ? [process.argv[input + 1]] : [] })
    .then(({ url, sessionCount, warnings }) => {
      console.log(`Chat Explorer: ${url} (${sessionCount} sessions, read-only)`);
      for (const warning of warnings) console.warn(warning);
    })
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}