// Node 22+ and installed Chrome/Edge. No installs or provider access required.
// Optional CHROME_PATH and CAPTURE_TMP (existing neutral scratch directory).
// Optional first argument: fresh output directory. Never overwrites images.
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { startServer as starter } from '../../sampleapp/src/server.js';
import { startServer as finished } from '../../../../appsample/src/server.js';
import { render } from './capture-browser.mjs';

const assets = fileURLToPath(new URL('../assets/', import.meta.url));
const out = path.resolve(process.argv[2] || path.join(assets, 'screenshots'));
const names = ['starter', 'finished', 'config', 'log'];
assert(names.every(n => !existsSync(path.join(out, n + '.png'))), 'Choose a fresh output directory.');
const chrome = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/chromium'].find(p => p && existsSync(p));
assert(chrome, 'Set CHROME_PATH to a local Chromium executable.');
const temp = await fs.mkdtemp(path.join(process.env.CAPTURE_TMP || (existsSync('C:/Temp') ? 'C:/Temp' : os.tmpdir()), 'workshop-'));
const workspace = path.join(temp, 'workspace');
const folder = path.join(workspace, 'chatSessions');
const servers = [];
try {
  Object.assign(process.env, { HOME: temp, USERPROFILE: temp, APPDATA: temp, XDG_CONFIG_HOME: temp });
  await fs.mkdir(folder, { recursive: true });
  await fs.writeFile(path.join(workspace, 'workspace.json'), JSON.stringify({ folder: 'file:///workshop/catalog-api' }));
  const fixture = path.join(assets, 'practice-session.jsonl');
  await fs.copyFile(fixture, path.join(folder, 'practice-session.jsonl'));
  const examples = [
    ['Review the response contract', 'Compare the fields returned by both catalog handlers.', 'Both versions return an items array with a stable id and display name.'],
    ['Plan the versioned endpoint', 'What should change first in the catalog API?', 'Add the versioned route alongside the existing one, then exercise both with the same fixture.']
  ];
  for (const [i, [customTitle, text, answer]] of examples.entries()) {
    const sessionId = `catalog-${i + 2}`, creationDate = Date.UTC(2026, 4, 13 - i, 12);
    const requests = [{ requestId: 'r0', timestamp: creationDate, modelId: 'copilot/gpt-4.1', message: { text }, response: [{ value: answer }] }];
    await fs.writeFile(path.join(folder, sessionId + '.jsonl'), JSON.stringify({ kind: 0, v: { sessionId, customTitle, creationDate, requests } }) + '\n');
  }
  const tenant = '00000000-0000-0000-0000-000000000001';
  let summaries = 0;
  for (const [i, start] of [starter, finished].entries()) {
    const dataDir = path.join(temp, i ? 'finished' : 'starter');
    await fs.mkdir(dataDir);
    if (i) await fs.writeFile(path.join(dataDir, '.env'), [
      `AZURE_TENANT_ID=${tenant}`, 'AZURE_CLIENT_ID=00000000-0000-0000-0000-000000000002',
      'AZURE_CLIENT_SECRET=fixture-only', 'AZURE_AUTHORITY_HOST=https://identity.invalid',
      'FOUNDRY_AGENT_ENDPOINT=https://foundry.invalid/api/projects/workshop', 'FOUNDRY_AGENT_NAME=handoff-demo', 'SUMMARY_OUTPUT_DIR=summaries'
    ].join('\n'));
    const app = await start({ port: 0, dataDir, envDir: dataDir, loadSamples: false, paths: [workspace],
      fetchImpl: async (url, options) => {
        // In-memory replies only; never delegates to fetch().
        if (String(url) === `https://identity.invalid/${tenant}/oauth2/v2.0/token`)
          return Response.json({ access_token: 'unused-fixture-token', expires_in: 3600 });
        assert.equal(new URL(url).hostname, 'foundry.invalid');
        assert.match(options.body, /Move the catalog route/);
        summaries++;
        return Response.json({ status: 'completed', output_text: '# Catalog route handoff\n\nBoth routes passed the fixture checks. Update the sample client next.' });
      } });
    servers.push(app);
    assert.equal(app.sessionCount, 3);
    assert.deepEqual(app.warnings, []);
  }
  const shots = new Map();
  for (const name of names) {
    const app = servers[Number(name !== 'starter')];
    let route = '/';
    if (name === 'log') {
      const session = app.library.list().sessions.find(s => s.title === 'Verify the route migration');
      assert.equal(session.stats.prompts, 2);
      assert.equal(session.stats.tools, 1);
      const job = await app.summaryService.startSummaryJob(session.id);
      let state;
      for (let i = 0; i < 100; i++) {
        state = app.summaryService.getJob(job.id);
        if (state.status !== 'running') break;
        await sleep(50);
      }
      assert.equal(state.status, 'completed', state.error);
      assert.equal(summaries, 1);
      route = `/log.html?job=${encodeURIComponent(job.id)}`;
    }
    shots.set(name, await render({ chrome, temp, app, name, route }));
  }
  await fs.mkdir(out, { recursive: true });
  for (const [n, png] of shots) await fs.writeFile(path.join(out, n + '.png'), png, { flag: 'wx' });
} finally {
  for (const { server } of servers) { server.closeAllConnections(); await new Promise(r => server.close(r)); }
  await fs.rm(temp, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 });
}
