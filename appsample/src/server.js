import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, rename, readdir, stat } from 'node:fs/promises';
import { summarizeSession, summarizeNode, detailNodeAsync, storyPage, discover } from './parser.js';
import { createLibrary } from './library.js';
import { createSummaryService } from './summarizer.js';
import { sessionUsageReport, usageReportMarkdown } from './usage.js';
import { workspaceReport } from './workspaces.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(projectRoot, 'public');
const MAX_JSON_BYTES = 32 * 1024;

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  'Cache-Control': 'no-store'
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

function applySecurityHeaders(res) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(key, value);
  }
}

function sendJson(res, status, payload, extraHeaders = {}) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8');
  applySecurityHeaders(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Length', body.length);
  for (const [key, value] of Object.entries(extraHeaders)) res.setHeader(key, value);
  res.writeHead(status);
  res.end(body);
}

function sendText(res, status, text, contentType = 'text/plain; charset=utf-8', extraHeaders = {}) {
  const body = Buffer.from(String(text ?? ''), 'utf8');
  applySecurityHeaders(res);
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Length', body.length);
  for (const [key, value] of Object.entries(extraHeaders)) res.setHeader(key, value);
  res.writeHead(status);
  res.end(body);
}

function contentDispositionAttachment(filename) {
  const safeAscii = String(filename || 'download').replace(/["\\\r\n]/g, '_');
  return `attachment; filename="${safeAscii}"`;
}

async function readJsonBody(req) {
  let total = 0;
  const chunks = [];
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_JSON_BYTES) {
      const err = new Error('Request payload exceeds 32 KB limit.');
      err.status = 413;
      throw err;
    }
    chunks.push(chunk);
  }
  if (!total) return null;
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const err = new Error('Invalid JSON request body.');
    err.status = 400;
    throw err;
  }
}

function decodeSegment(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    const err = new Error('Malformed URL parameter.');
    err.status = 400;
    throw err;
  }
}

async function serveStaticFile(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }
  let decoded;
  try {
    decoded = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  } catch {
    sendJson(res, 400, { error: 'Malformed URL path.' });
    return;
  }
  if (decoded.includes('\0')) {
    sendJson(res, 400, { error: 'Invalid URL path.' });
    return;
  }
  const relative = decoded.replace(/^\/+/, '');
  const resolved = path.resolve(publicDir, relative);
  const rootWithSep = publicDir.endsWith(path.sep) ? publicDir : publicDir + path.sep;
  if (resolved !== publicDir && !resolved.startsWith(rootWithSep)) {
    sendJson(res, 403, { error: 'Forbidden.' });
    return;
  }

  let target = resolved;
  let info = await stat(target).catch(() => null);
  if (info?.isDirectory()) {
    target = path.join(target, 'index.html');
    info = await stat(target).catch(() => null);
  }
  if (!info?.isFile()) {
    sendJson(res, 404, { error: 'Not found.' });
    return;
  }

  const ext = path.extname(target).toLowerCase();
  applySecurityHeaders(res);
  res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
  res.setHeader('Content-Length', info.size);
  res.writeHead(200);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  const stream = createReadStream(target);
  stream.on('error', () => {
    if (!res.headersSent) sendJson(res, 500, { error: 'Failed to read static file.' });
    else res.destroy();
  });
  stream.pipe(res);
}

function defaultDevicePaths() {
  const home = os.homedir();
  const vscodeStorage = process.platform === 'win32'
    ? path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Code', 'User', 'workspaceStorage')
    : process.platform === 'darwin'
      ? path.join(home, 'Library', 'Application Support', 'Code', 'User', 'workspaceStorage')
      : path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'Code', 'User', 'workspaceStorage');
  const agentSessions = path.join(home, '.copilot', 'session-state');
  return { vscodeStorage, agentSessions };
}

export async function startServer({ port = 3210, dataDir, envDir, loadSamples = true, paths = [], fetchImpl, maxChunkChars } = {}) {
  const configFile = dataDir ? path.join(dataDir, 'settings.json') : path.join(projectRoot, '.chat-explorer.json');
  const imports = new Set();
  const startupWarnings = [];
  let saveQueue = Promise.resolve();
  let locationQueue = Promise.resolve();
  let scan = { running: false, startedAt: null, completedAt: null, errors: [], added: 0, removed: 0, reindexed: 0 };
  function changeLocations(operation) {
    const result = locationQueue.catch(() => {}).then(operation);
    locationQueue = result;
    return result;
  }

  const library = createLibrary({ cacheDir: path.join(dataDir || path.join(projectRoot, '.chat-explorer-cache'), dataDir ? 'index-cache' : '') });
  const summaryService = createSummaryService({
    baseDir: envDir || dataDir || projectRoot,
    getSession: (id) => library.getSession(id),
    getWorkspace: (id) => library.getWorkspace(id),
    fetchImpl,
    maxChunkChars
  });

  async function importPath(input, persist = true) {
    const result = await library.addPath(input, { allowEmpty: true });
    imports.add(path.resolve(input));
    if (persist) {
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

  let savedLocations = false;
  try {
    const config = JSON.parse(await readFile(configFile, 'utf8'));
    savedLocations = Array.isArray(config.paths);
    for (const input of config.paths || []) {
      imports.add(input);
      try { await importPath(input, false); } catch (error) { startupWarnings.push(`${input}: ${error.message}`); }
    }
  } catch (error) { if (error.code !== 'ENOENT') startupWarnings.push(`Saved library: ${error.message}`); }

  if (!library.size && loadSamples && !savedLocations) {
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

  const server = http.createServer(async (req, res) => {
    try {
      const host = req.headers.host;
      if (!host || !/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) {
        sendJson(res, 403, { error: 'Local requests only.' });
        return;
      }
      if ((req.headers.origin && ![`http://${host}`].includes(req.headers.origin)) || req.headers['sec-fetch-site'] === 'cross-site') {
        sendJson(res, 403, { error: 'Cross-origin access is not allowed.' });
        return;
      }

      const parsedUrl = new URL(req.url || '/', `http://${host}`);
      const pathname = parsedUrl.pathname;
      const searchParams = parsedUrl.searchParams;
      const method = req.method || 'GET';

      if (pathname.startsWith('/api/')) {
        if (method === 'GET' && pathname === '/api/sessions') {
          sendJson(res, 200, { ...library.list(), warnings: startupWarnings, defaultPaths: defaultDevicePaths(), locations: [...imports], scan });
          return;
        }
        if (method === 'POST' && pathname === '/api/scan') {
          if (!scan.running) {
            scan = { running: true, startedAt: new Date().toISOString(), completedAt: null, errors: [], added: 0, removed: 0, reindexed: 0 };
            const active = scan;
            changeLocations(async () => {
              const before = new Set(library.list().sessions.map((session) => session.id));
              for (const input of imports) {
                try {
                  const result = await library.addPath(input, { allowEmpty: true, retryErrors: true });
                  active.reindexed += result.indexing;
                } catch (error) { active.errors.push(`${input}: ${error.message}. Previously indexed data for this location was retained.`); }
              }
              library.retainPaths([...imports]);
              await library.idle();
              const after = library.list().sessions;
              active.added = after.filter((session) => !before.has(session.id)).length;
              const ids = new Set(after.map((session) => session.id));
              active.removed = [...before].filter((id) => !ids.has(id)).length;
              active.errors.push(...after.filter((session) => session.status === 'error').map((session) => `${session.title}: ${session.error}`));
            }).catch((error) => { active.errors.push(`Scan failed: ${error.message}`); })
              .finally(() => { active.running = false; active.completedAt = new Date().toISOString(); });
          }
          sendJson(res, 202, { scan });
          return;
        }
        if (method === 'GET' && pathname === '/api/folders') {
          const input = searchParams.get('path') || os.homedir();
          const directory = path.resolve(input);
          const info = await stat(directory);
          if (!info.isDirectory()) { sendJson(res, 400, { error: 'Select a directory to browse.' }); return; }
          const children = await readdir(directory, { withFileTypes: true });
          const directories = children.filter((entry) => entry.isDirectory()).map((entry) => ({
            name: entry.name, path: path.join(directory, entry.name)
          })).sort((a, b) => a.name.localeCompare(b.name));
          const drives = process.platform === 'win32' ? (await Promise.all('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(async (letter) => {
            const drive = `${letter}:\\`;
            try { return (await stat(drive)).isDirectory() ? drive : null; }
            catch (error) { if (['ENOENT', 'EACCES', 'EPERM', 'EBUSY', 'UNKNOWN'].includes(error.code)) return null; throw error; }
          }))).filter(Boolean) : ['/'];
          sendJson(res, 200, { path: directory, parent: path.dirname(directory), directories, drives });
          return;
        }
        if (method === 'POST' && pathname === '/api/locations/check') {
          const body = await readJsonBody(req);
          if (typeof body?.path !== 'string' || !body.path.trim()) {
            sendJson(res, 400, { error: 'A local path is required.' }); return;
          }
          const input = path.resolve(body.path.trim());
          const files = await discover(input, { allowEmpty: true });
          sendJson(res, 200, { path: input, found: files.length });
          return;
        }
        if (method === 'PUT' && pathname === '/api/locations') {
          const body = await readJsonBody(req);
          if (!Array.isArray(body?.paths) || body.paths.length > 100 ||
            body.paths.some((input) => typeof input !== 'string' || !input.trim())) {
            sendJson(res, 400, { error: 'Provide up to 100 non-empty local paths.' }); return;
          }
          await changeLocations(async () => {
            const next = [...new Set(body.paths.map((input) => path.resolve(input.trim())))];
            const save = saveQueue.catch(() => {}).then(async () => {
              const temporary = `${configFile}.${process.pid}.tmp`;
              await writeFile(temporary, JSON.stringify({ paths: next }, null, 2), { mode: 0o600 });
              await rename(temporary, configFile);
            });
            saveQueue = save;
            await save;
            imports.clear();
            for (const input of next) imports.add(input);
            const errors = [];
            for (const input of next) {
              try { await library.addPath(input, { allowEmpty: true }); }
              catch (error) { errors.push(`${input}: ${error.message}`); }
            }
            library.retainPaths(next);
            sendJson(res, 200, { locations: [...imports], errors, ...library.list() });
          });
          return;
        }
        if (method === 'POST' && pathname === '/api/import') {
          const body = await readJsonBody(req);
          if (typeof body?.path !== 'string' || !body.path.trim()) {
            sendJson(res, 400, { error: 'A local path is required.' });
            return;
          }
          sendJson(res, 200, await changeLocations(() => importPath(body.path.trim())));
          return;
        }
        if (method === 'GET' && pathname === '/api/search') {
          const query = String(searchParams.get('q') || '').slice(0, 200);
          const sessionScope = searchParams.get('session');
          sendJson(res, 200, library.search(query, { session: sessionScope ? String(sessionScope) : undefined }));
          return;
        }
        if (method === 'GET' && pathname === '/api/summary/config') {
          sendJson(res, 200, await summaryService.getPublicConfig());
          return;
        }
        if (method === 'POST' && pathname === '/api/summary/config') {
          const body = await readJsonBody(req);
          sendJson(res, 200, await summaryService.saveConfig(body || {}));
          return;
        }
        if (method === 'POST' && pathname === '/api/summary/test') {
          const body = await readJsonBody(req);
          sendJson(res, 200, await summaryService.testConnection(body || null));
          return;
        }

        let match;
        if (method === 'GET' && (match = /^\/api\/(workspaces|sessions)\/([^/]+)\/summaries$/.exec(pathname))) {
          sendJson(res, 200, await summaryService.listSavedSummaries(decodeSegment(match[2]), {
            scope: match[1] === 'workspaces' ? 'workspace' : 'session'
          }));
          return;
        }
        if (method === 'GET' && (match = /^\/api\/summary\/saved\/([^/]+)(?:\/(download))?$/.exec(pathname))) {
          const summary = await summaryService.getSavedSummary(decodeSegment(match[1]));
          if (match[2]) {
            sendText(res, 200, summary.markdown, 'text/markdown; charset=utf-8', {
              'Content-Disposition': contentDispositionAttachment(summary.fileName)
            });
          } else sendJson(res, 200, summary);
          return;
        }
        if (method === 'GET' && (match = /^\/api\/workspaces\/([^/]+)(?:\/(export|usage))?$/.exec(pathname))) {
          const workspace = library.getWorkspace(decodeSegment(match[1]));
          if (match[2] === 'export') {
            sendText(res, 200, workspaceReport(workspace), 'text/markdown; charset=utf-8', {
              'Content-Disposition': contentDispositionAttachment(`workspace-${workspace.id}-usage.md`)
            });
          } else sendJson(res, 200, workspace);
          return;
        }
        if (method === 'POST' && (match = /^\/api\/workspaces\/([^/]+)\/summarize$/.exec(pathname))) {
          await readJsonBody(req);
          sendJson(res, 202, await summaryService.startSummaryJob(decodeSegment(match[1]), { scope: 'workspace' }));
          return;
        }
        if (method === 'GET' && (match = /^\/api\/summary\/jobs\/([^/]+)$/.exec(pathname))) {
          const job = summaryService.getJob(decodeSegment(match[1]), { includeMarkdown: searchParams.get('markdown') === '1' });
          if (!job) { sendJson(res, 404, { error: 'Summary operation not found.' }); return; }
          sendJson(res, 200, job);
          return;
        }
        if (method === 'GET' && (match = /^\/api\/summary\/jobs\/([^/]+)\/download$/.exec(pathname))) {
          const job = summaryService.getJob(decodeSegment(match[1]), { includeMarkdown: true });
          if (!job) { sendJson(res, 404, { error: 'Summary operation not found.' }); return; }
          if (job.status !== 'completed' || !job.markdown) { sendJson(res, 409, { error: 'Summary is not ready yet.' }); return; }
          sendText(res, 200, job.markdown, 'text/markdown; charset=utf-8', {
            'Content-Disposition': contentDispositionAttachment(job.fileName)
          });
          return;
        }
        if (method === 'GET' && (match = /^\/api\/sessions\/([^/]+)$/.exec(pathname))) {
          const session = await library.getSession(decodeSegment(match[1]));
          sendJson(res, 200, {
            ...summarizeSession(session),
            overview: summarizeNode(session.overview),
            requests: session.requests.map(summarizeNode)
          });
          return;
        }
        if (method === 'GET' && (match = /^\/api\/sessions\/([^/]+)\/nodes\/([^/]+)$/.exec(pathname))) {
          const session = await library.getSession(decodeSegment(match[1]));
          const item = session.nodes.get(decodeSegment(match[2]));
          if (!item) { sendJson(res, 404, { error: 'Item not found.' }); return; }
          sendJson(res, 200, await detailNodeAsync(session, item));
          return;
        }
        if (method === 'GET' && (match = /^\/api\/sessions\/([^/]+)\/story$/.exec(pathname))) {
          const session = await library.getSession(decodeSegment(match[1]));
          sendJson(res, 200, storyPage(session, {
            parentId: searchParams.get('parent') || undefined,
            offset: Number(searchParams.get('offset') || 0),
            limit: Number(searchParams.get('limit') || 16)
          }));
          return;
        }
        if (method === 'GET' && (match = /^\/api\/sessions\/([^/]+)\/search$/.exec(pathname))) {
          const query = String(searchParams.get('q') || '').toLowerCase().trim();
          const session = await library.getSession(decodeSegment(match[1]));
          sendJson(res, 200, {
            ids: query ? [...session.nodes.values()].filter((item) => item.searchText.includes(query)).map((item) => item.id) : []
          });
          return;
        }
        if (method === 'GET' && (match = /^\/api\/sessions\/([^/]+)\/export$/.exec(pathname))) {
          const session = await library.getSession(decodeSegment(match[1]));
          sendJson(res, 200, session.raw, {
            'Content-Disposition': contentDispositionAttachment(`chat-${session.id}.json`)
          });
          return;
        }
        if (method === 'GET' && (match = /^\/api\/sessions\/([^/]+)\/usage(?:\/(export))?$/.exec(pathname))) {
          const session = await library.getSession(decodeSegment(match[1]));
          if (match[2]) {
            sendText(res, 200, usageReportMarkdown(session), 'text/markdown; charset=utf-8', {
              'Content-Disposition': contentDispositionAttachment(`chat-${session.id}-ai-credits.md`)
            });
          } else sendJson(res, 200, sessionUsageReport(session));
          return;
        }
        if (method === 'POST' && (match = /^\/api\/sessions\/([^/]+)\/summarize$/.exec(pathname))) {
          await readJsonBody(req);
          sendJson(res, 202, await summaryService.startSummaryJob(decodeSegment(match[1])));
          return;
        }

        sendJson(res, 404, { error: 'API route not found.' });
        return;
      }

      await serveStaticFile(req, res, pathname);
    } catch (error) {
      console.error(error.message);
      if (!res.headersSent) {
        sendJson(res, error.status || 400, { error: error.message });
      } else {
        res.destroy();
      }
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve();
    });
  });

  const actual = server.address().port;
  return { server, port: actual, url: `http://127.0.0.1:${actual}`, sessionCount: library.size, warnings: startupWarnings, importPath, library, summaryService };
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