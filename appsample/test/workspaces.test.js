import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rename, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../src/server.js';
import { createSummaryService } from '../src/summarizer.js';
import { workspaceIdentity, workspaceOverview, workspaceReport } from '../src/workspaces.js';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'chronicle-workspace-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  async function save(relative, value) {
    const file = path.join(root, ...relative.split('\\'));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, typeof value === 'string' ? value : JSON.stringify(value));
    return file;
  }
  const first = await save('legacy\\chatSessions\\one.json', {
    sessionId: 'one', customTitle: 'First task', creationDate: 1000, requests: [{
      requestId: 'r1', timestamp: 1000, modelId: 'gpt-5.3-codex',
      inputTokens: 1000, outputTokens: 100, cacheReadTokens: 0, cacheWriteTokens: 0,
      message: { text: 'Implement legacy feature alpha' }, response: [{ value: 'Alpha implemented.' }]
    }]
  });
  await save('legacy\\workspace.json', { folder: 'file:///c%3A/repos/demo' });
  const second = await save('agents\\two\\events.jsonl', [
    { type: 'session.start', data: { selectedModel: 'claude-sonnet-5.5' } },
    { type: 'user.message', data: { content: 'Review agent feature beta' } },
    { type: 'assistant.message', data: { model: 'claude-sonnet-5.5', content: 'Beta reviewed.' } },
    { type: 'assistant.usage', data: { model: 'claude-sonnet-5.5', inputTokens: 1000, outputTokens: 100, cacheReadTokens: 0, cacheWriteTokens: 0 } },
    { type: 'session.shutdown', data: { totalNanoAiu: 1500000000, modelMetrics: {
      'claude-sonnet-5.5': { usage: { inputTokens: 5000, outputTokens: 1000, cacheReadTokens: 0, cacheWriteTokens: 0 } }
    } } }
  ].map((event, index) => JSON.stringify({ timestamp: new Date(2000 + index * 100).toISOString(), ...event })).join('\n'));
  await save('agents\\two\\workspace.yaml', 'id: two\ncwd: C:\\repos\\demo\nsummary: Second task\ncreated_at: 1970-01-01T00:00:02.000Z\n');
  return { root, save, first, second };
}
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);

test('Scan for Updates refreshes loaded sessions and sidecars, adds/removes files and preserves unavailable roots with errors', async (t) => {
  const { root, save, first, second } = await fixture(t);
  const checkpoint = await save('agents\\two\\checkpoints\\001.md', '# Saved checkpoint\nOld handoff.');
  let instance = await startServer({ port: 0, dataDir: root, loadSamples: false, paths: [path.join(root, 'legacy'), path.join(root, 'agents')] });
  t.after(async () => { instance.library.close(); await new Promise((resolve) => instance.server.close(resolve)); });
  await instance.library.idle();
  const list = async () => (await fetch(`${instance.url}/api/sessions`)).json();
  const scan = async () => {
    const response = await fetch(`${instance.url}/api/scan`, { method: 'POST' });
    assert.equal(response.status, 202);
    const deadline = Date.now() + 10000;
    let result;
    do {
      result = await list();
      if (!result.scan.running && !result.indexing.active) break;
      assert.ok(Date.now() < deadline, 'scan completes');
      await new Promise((resolve) => setTimeout(resolve, 10));
    } while (true);
    assert.ok(result.scan.completedAt);
    return result;
  };
  const original = (await list()).sessions.find((session) => session.file === second);
  const loaded = await instance.library.getSession(original.id);
  assert.equal(loaded.usage.reported.aiUnits, 1.5);
  const changed = `${await readFile(second, 'utf8')}\n${JSON.stringify({ type: 'session.usage_checkpoint', timestamp: new Date(5000).toISOString(), data: { totalNanoAiu: 2500000000 } })}\n`;
  await writeFile(second, changed);
  const third = await save('agents\\three\\events.jsonl', JSON.stringify({ type: 'user.message', data: { content: 'New saved session' } }));
  await rm(first);
  let result = await scan();
  assert.equal(result.sessions.length, 2);
  assert.equal(result.scan.added, 1);
  assert.equal(result.scan.removed, 1);
  assert.equal(result.scan.reindexed, 2);
  assert.deepEqual(result.scan.errors, []);
  const refreshed = await instance.library.getSession(original.id);
  assert.notEqual(refreshed, loaded);
  assert.equal(refreshed.usage.reported.aiUnits, 2.5);
  assert.equal(loaded.usage.reported.aiUnits, 1.5);
  assert.equal(await readFile(second, 'utf8'), changed);
  await writeFile(checkpoint, '# Saved checkpoint\nA new longer handoff saved without changing events.jsonl.');
  result = await scan();
  assert.equal(result.scan.reindexed, 1);
  const sidecarRefreshed = await instance.library.getSession(original.id);
  assert.match(JSON.stringify(sidecarRefreshed.overview), /new longer handoff/);
  assert.equal(await readFile(second, 'utf8'), changed);
  await rename(path.join(root, 'agents'), path.join(root, 'offline-agents'));
  result = await scan();
  assert.equal(result.sessions.length, 2);
  assert.equal(result.scan.errors.length, 1);
  assert.match(result.scan.errors[0], /retained/);
  await rename(path.join(root, 'offline-agents'), path.join(root, 'agents'));
  await rm(second); await rm(third);
  result = await scan();
  assert.equal(result.sessions.length, 0);
  assert.equal(result.scan.removed, 2);
  assert.deepEqual(result.scan.errors, []);
  instance.library.close();
  await new Promise((resolve) => instance.server.close(resolve));
  instance = await startServer({ port: 0, dataDir: root, loadSamples: false });
  result = await list();
  assert.equal(result.sessions.length, 0);
  assert.deepEqual(result.warnings, [], 'Valid empty saved locations stay valid after restart');
  const checked = await fetch(`${instance.url}/api/locations/check`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: path.join(root, 'agents') })
  });
  assert.equal(checked.status, 200);
  assert.equal((await checked.json()).found, 0);
});

test('workspace identities separate same-name paths and normalize Windows path case and separators', () => {
  const a = { workspacePath: 'C:\\repos\\demo', workspaceName: 'demo' };
  assert.equal(workspaceIdentity(a), workspaceIdentity({ workspacePath: 'c:/Repos/demo/' }));
  assert.notEqual(workspaceIdentity(a), workspaceIdentity({ workspacePath: 'D:\\repos\\demo', workspaceName: 'demo' }));
  assert.notEqual(workspaceIdentity({ file: 'C:\\data\\hash1\\chatSessions\\one.json' }),
    workspaceIdentity({ file: 'C:\\data\\hash2\\chatSessions\\two.json' }));
});

test('workspace rollups account for pending/failed/missing usage without double-counting session snapshots', async (t) => {
  const { root, first, second } = await fixture(t);
  const originals = await Promise.all([readFile(first), readFile(second)]);
  const instance = await startServer({ port: 0, dataDir: root, loadSamples: false, paths: [path.join(root, 'legacy'), path.join(root, 'agents')] });
  t.after(async () => { instance.library.close(); await new Promise((resolve) => instance.server.close(resolve)); });
  await instance.library.idle();
  const sessions = (await (await fetch(`${instance.url}/api/sessions`)).json()).sessions;
  assert.equal(sessions.length, 2);
  assert.equal(sessions[0].workspaceId, sessions[1].workspaceId);
  const response = await fetch(`${instance.url}/api/workspaces/${sessions[0].workspaceId}`);
  assert.equal(response.status, 200);
  const workspace = await response.json();
  assert.equal(workspace.sessionCount, 2);
  assert.equal(workspace.indexedCount, 2);
  assert.equal(workspace.stats.prompts, 2);
  assert.equal(workspace.stats.responses, 2);
  assert.equal(workspace.stats.models, 2);
  assert.equal(workspace.usage.tokens.input, 2000);
  near(workspace.usage.credits, 0.615);
  near(workspace.usage.usd, 0.00615);
  near(workspace.usage.aggregate.credits, 2);
  assert.equal(workspace.usage.aggregateSessions, 1);
  assert.equal(workspace.usage.reported.nanoAiu, 1500000000);
  assert.equal(workspace.usage.reported.aiUnits, 1.5);
  assert.equal(workspace.usage.reported.coveredSessions, 1);
  assert.equal(workspace.usage.reported.totalSessions, 2);
  assert.equal(workspace.usage.reported.partial, true);
  assert.deepEqual(workspace.sessions.map((session) => session.title), ['First task', 'Second task']);
  const exportResponse = await fetch(`${instance.url}/api/workspaces/${workspace.id}/export`);
  assert.match(exportResponse.headers.get('content-disposition'), /workspace-.+-usage\.md/);
  const report = await exportResponse.text();
  assert.match(report, /First task/);
  assert.match(report, /Second task/);
  assert.match(report, /0\.615 AI credits/);
  assert.match(report, /NOT added/);
  assert.match(report, /1\.5 AI units/);
  const pending = { ...sessions[0], id: 'pending', status: 'pending', stats: null, usage: undefined };
  const failed = { ...pending, id: 'failed', status: 'error', error: 'Bad source' };
  const partial = workspaceOverview(workspace.id, [...sessions, pending, failed]);
  assert.equal(partial.stats.prompts, 2);
  assert.equal(partial.sessionCount, 4);
  assert.equal(partial.pendingCount, 1);
  assert.equal(partial.failedCount, 1);
  assert.equal(partial.usage.tokens.input, null);
  assert.equal(partial.usage.partial, true);
  near(partial.usage.credits, 0.615);
  const withReported = sessions.map((session, index) => ({
    ...session, usage: { ...session.usage, reported: { nanoAiu: index ? 1500000000 : 1750000000, warnings: [] } }
  }));
  const combined = workspaceOverview(workspace.id, withReported);
  assert.equal(combined.usage.reported.aiUnits, 3.25);
  assert.equal(combined.usage.reported.coveredSessions, 2);
  assert.equal(combined.usage.reported.partial, false);
  near(combined.usage.credits, 0.615);
  withReported[0].usage.reported.nanoAiu = Number.MAX_SAFE_INTEGER;
  const oversized = workspaceOverview(workspace.id, withReported).usage.reported;
  assert.equal(oversized.nanoAiu, null);
  assert.equal(oversized.partial, true);
  assert.match(oversized.warnings.join(' '), /safe numeric range/);
  assert.match(workspaceReport(partial), /Bad source/);
  assert.equal((await fetch(`${instance.url}/api/workspaces/missing`)).status, 404);
  assert.deepEqual(await readFile(first), originals[0]);
  assert.deepEqual(await readFile(second), originals[1]);
});

test('unified locations check does not import; edits and removal persist, overlapping sources retain sessions', async (t) => {
  const { root, first, second } = await fixture(t);
  const dataDir = path.join(root, 'settings');
  await mkdir(dataDir);
  let instance = await startServer({ port: 0, dataDir, loadSamples: false });
  t.after(async () => { instance.library.close(); await new Promise((resolve) => instance.server.close(resolve)); });
  const put = async (paths) => {
    const response = await fetch(`${instance.url}/api/locations`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paths })
    });
    assert.equal(response.status, 200);
    return response.json();
  };
  const json = async (suffix) => (await fetch(`${instance.url}${suffix}`)).json();
  const check = await fetch(`${instance.url}/api/locations/check`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: path.join(root, 'agents') })
  });
  assert.equal((await check.json()).found, 1);
  assert.equal((await json('/api/sessions')).sessions.length, 0);
  const folders = await json(`/api/folders?path=${encodeURIComponent(root)}`);
  assert.ok(folders.directories.some((entry) => entry.name === 'agents'));
  assert.equal(folders.parent, path.dirname(root));
  assert.equal((await fetch(`${instance.url}/api/folders?path=${encodeURIComponent(first)}`)).status, 400);
  assert.equal((await put([root, path.dirname(first)])).sessions.length, 2);
  await instance.library.idle();
  const removed = await put([path.dirname(first)]);
  assert.equal(removed.sessions.length, 1);
  assert.equal(removed.sessions[0].sessionId, 'one');
  const edited = await put([path.dirname(second)]);
  assert.equal(edited.sessions.length, 1);
  assert.equal(edited.sessions[0].sessionId, 'two');
  await instance.library.idle();
  assert.deepEqual(JSON.parse(await readFile(path.join(dataDir, 'settings.json'), 'utf8')).paths, [path.dirname(second)]);
  const bad = await put([path.join(root, 'missing')]);
  assert.equal(bad.errors.length, 1);
  assert.equal(bad.sessions.length, 0);
  const empty = await put([]);
  assert.equal(empty.sessions.length, 0);
  instance.library.close();
  await new Promise((resolve) => instance.server.close(resolve));
  instance = await startServer({ port: 0, dataDir, loadSamples: true });
  assert.deepEqual((await json('/api/sessions')).locations, []);
  assert.equal(instance.library.size, 0, 'Saved empty locations must not reload default samples');
  assert.ok((await readFile(first)).length);
  assert.ok((await readFile(second)).length);
});

test('workspace summaries include every session and append deterministic usage, with isolated scope and output', async (t) => {
  const { root } = await fixture(t);
  const prompts = [];
  const fetchImpl = async (url, options) => {
    if (String(url).includes('oauth2')) return new Response(JSON.stringify({ access_token: 'fixture-token', expires_in: 3600 }));
    prompts.push(JSON.parse(options.body).input);
    return new Response(JSON.stringify({ status: 'completed', output_text: '# Workspace Handoff Summary: demo\n\nCombined changes.' }));
  };
  let instance = await startServer({ port: 0, dataDir: root, loadSamples: false,
    paths: [path.join(root, 'legacy'), path.join(root, 'agents')], fetchImpl });
  t.after(async () => { instance.library.close(); await new Promise((resolve) => instance.server.close(resolve)); });
  await instance.library.idle();
  const id = instance.library.list().sessions[0].workspaceId;
  const summariesUrl = `/api/workspaces/${id}/summaries`;
  assert.deepEqual(await (await fetch(`${instance.url}${summariesUrl}`)).json(), []);
  await instance.summaryService.saveConfig({
    tenantId: 'test-tenant', clientId: 'test-client', clientSecret: 'fixture-secret',
    agentEndpoint: 'https://example.services.ai.azure.com/api/projects/test/agents/summary/endpoint/protocols/openai/responses'
  });
  const response = await fetch(`${instance.url}/api/workspaces/${id}/summarize`, { method: 'POST' });
  assert.equal(response.status, 202);
  let job = await response.json();
  for (let attempt = 0; attempt < 50 && job.status === 'running'; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    job = instance.summaryService.getJob(job.id, { includeMarkdown: true });
  }
  assert.equal(job.status, 'completed', job.error);
  assert.equal(job.scope, 'workspace');
  assert.equal(job.stats.sessions, 2);
  assert.match(job.fileName, /^workspace-demo-.+-summary\.md$/);
  const requestText = JSON.stringify(prompts);
  assert.match(requestText, /Implement legacy feature alpha/);
  assert.match(requestText, /Review agent feature beta/);
  assert.match(requestText, /SESSION 1\/2/);
  assert.match(requestText, /SESSION 2\/2/);
  assert.match(job.markdown, /# Workspace Handoff Summary/);
  assert.match(job.markdown, /0\.615 AI credits/);
  assert.equal(await readFile(job.outputPath, 'utf8'), job.markdown);
  assert.match(job.fileName, /-\d{4}-\d{2}-\d{2}T[\d-]+Z-[a-f0-9]{8}-summary\.md$/);
  const firstJob = job;
  const next = await instance.summaryService.startSummaryJob(id, { scope: 'workspace' });
  for (let attempt = 0; attempt < 50; attempt++) {
    job = instance.summaryService.getJob(next.id, { includeMarkdown: true });
    if (job.status !== 'running') break;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(job.status, 'completed', job.error);
  assert.notEqual(job.fileName, firstJob.fileName);
  assert.equal(await readFile(firstJob.outputPath, 'utf8'), firstJob.markdown);
  const list = await (await fetch(`${instance.url}${summariesUrl}`)).json();
  assert.equal(list.length, 2);
  assert.equal(list[0].id, job.savedSummaryId);
  assert.equal(list[1].id, firstJob.savedSummaryId);
  assert.equal('markdown' in list[0], false);
  assert.deepEqual(await (await fetch(`${instance.url}/api/workspaces/other/summaries`)).json(), []);
  assert.deepEqual(await (await fetch(`${instance.url}/api/sessions/${id}/summaries`)).json(), []);
  const savedUrl = `/api/summary/saved/${firstJob.savedSummaryId}`;
  assert.equal((await (await fetch(`${instance.url}${savedUrl}`)).json()).markdown, firstJob.markdown);
  const download = await fetch(`${instance.url}${savedUrl}/download`);
  assert.equal(download.status, 200);
  assert.match(download.headers.get('content-type'), /text\/markdown/);
  assert.ok(download.headers.get('content-disposition').includes(firstJob.fileName));
  assert.equal(await download.text(), firstJob.markdown);
  assert.equal((await fetch(`${instance.url}/api/summary/saved/invalid`)).status, 404);
  assert.equal((await fetch(`${instance.url}${savedUrl}`, { headers: { Origin: 'https://example.com' } })).status, 403);
  const blocked = createSummaryService({
    baseDir: root, getWorkspace: () => ({ ...instance.library.getWorkspace(id), pendingCount: 1 }),
    getSession: () => { throw new Error('Should not parse a session'); }, fetchImpl
  });
  await assert.rejects(() => blocked.startSummaryJob(id, { scope: 'workspace' }), /indexed successfully/);

  const legacyName = `workspace-demo-${id}-summary.md`;
  await writeFile(path.join(root, 'summaries', legacyName), '# Previously generated workspace summary\n');
  instance.library.close();
  await new Promise((resolve) => instance.server.close(resolve));
  await rm(path.join(root, '.env'));
  instance = await startServer({ port: 0, dataDir: root, loadSamples: false });
  const afterRestart = await (await fetch(`${instance.url}${summariesUrl}`)).json();
  assert.equal(afterRestart.length, 3, 'Saved versions survive restart and remain readable without Foundry configuration');
  assert.equal(instance.summaryService.getJob(firstJob.id), null);
  assert.equal((await (await fetch(`${instance.url}${savedUrl}`)).json()).markdown, firstJob.markdown);
  const legacy = afterRestart.find((summary) => summary.legacy);
  assert.equal(legacy.fileName, legacyName);
  assert.equal((await (await fetch(`${instance.url}/api/summary/saved/${encodeURIComponent(legacy.id)}`)).json()).markdown,
    '# Previously generated workspace summary\n');
});
