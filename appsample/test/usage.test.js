import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { normalizeUsage, priceUsage, createUsageAccounting, usageReportMarkdown } from '../src/usage.js';
import { loadSession, summarizeNode, summarizeSession, storyPage } from '../src/parser.js';
import { startServer } from '../src/server.js';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
const usage = (inputTokens, outputTokens, extra = {}) => ({
  inputTokens, outputTokens, cacheReadTokens: 0, cacheWriteTokens: 0, ...extra
});
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'chronicle-usage-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  async function save(relative, value) {
    const file = path.join(root, relative);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, typeof value === 'string' ? value : JSON.stringify(value));
    return file;
  }
  return { root, save };
}

test('prices cached and written input once, and includes reasoning in output without an extra charge', () => {
  const tokens = normalizeUsage(usage(100000, 10000, { cacheReadTokens: 20000, cacheWriteTokens: 10000, reasoningTokens: 4000 }));
  const result = priceUsage('copilot/claude-sonnet-5.5', tokens);
  near(result.components.input, 14);
  near(result.components.cached, 0.2);
  near(result.components.cacheWrite, 2.5);
  near(result.components.output, 10);
  near(result.credits, 26.7);
  assert.equal(result.partial, false);
  const native = normalizeUsage({ usage: {
    input_tokens: 70000, cache_read_input_tokens: 20000, cache_creation_input_tokens: 10000, output_tokens: 10000
  } });
  assert.equal(native.input, 100000);
  near(priceUsage('claude-sonnet-5.5', native).credits, 26.7);
  const openai = normalizeUsage({ usage: {
    prompt_tokens: 100000, prompt_tokens_details: { cached_tokens: 20000 }, completion_tokens: 10000,
    completion_tokens_details: { reasoning_tokens: 4000 }
  } });
  near(priceUsage('gpt-5.3-codex', openai).credits, 28.35);
});

test('context thresholds are per call, strict greater-than, and announced rate changes are date-aware', () => {
  const base = priceUsage('gpt-6.1-sol', normalizeUsage(usage(272000, 1000)));
  near(base.credits, 55.4);
  assert.equal(base.tier, 'Default');
  const long = priceUsage('gpt-6.1-sol', normalizeUsage(usage(272001, 1000)));
  near(long.credits, 110.3004);
  assert.equal(long.tier, 'Long context');
  const aggregate = priceUsage('gpt-6.1-sol', normalizeUsage(usage(272001, 1000)), { aggregate: true });
  assert.equal(aggregate.tier, 'Default');
  assert.equal(aggregate.partial, true);
  const tokens = normalizeUsage(usage(1000000, 0));
  near(priceUsage('gemini-4-carbon', tokens, { now: '2026-11-30' }).credits, 200);
  near(priceUsage('gemini-4-carbon', tokens, { now: '2026-12-01' }).credits, 400);
  assert.equal(priceUsage('gemini-4-argon', tokens, { now: '2026-12-01' }).credits, null);
});

test('unknown prices and missing/invalid tokens stay unavailable; explicit zero is priced', () => {
  const tokens = normalizeUsage(usage(0, 0));
  assert.equal(priceUsage('gpt-5.3-codex', tokens).credits, 0);
  for (const model of ['auto', 'gpt-4.1', 'constructor', 'custom-model']) {
    assert.equal(priceUsage(model, tokens).credits, null);
  }
  assert.equal(priceUsage('gpt-5.3-codex', tokens, { byok: true }).credits, null);
  for (const data of [
    { inputTokens: 1 }, { inputTokens: -1, outputTokens: 2 },
    { inputTokens: '10', outputTokens: 2 }, usage(1, 2, { cacheReadTokens: 3 }),
    usage(1, 2, { cacheReadTokens: -1 }), usage(2, 2, { cacheWriteTokens: 1 })
  ]) assert.equal(priceUsage('gpt-5.3-codex', normalizeUsage(data)).credits, null);
  const missingCache = priceUsage('gpt-5.3-codex', normalizeUsage({ promptTokens: 1000, completionTokens: 10 }));
  assert.ok(missingCache.credits > 0);
  assert.equal(missingCache.partial, true);
  assert.equal(normalizeUsage({ currentTokens: 999, tokenLimit: 10000 }), null);
});

test('increments turns across models without duplicate call IDs, sidecars, request totals, or cumulative snapshots', () => {
  const requests = [
    { id: 'r1', model: 'gpt-5.3-codex' }, { id: 'r2', model: 'claude-sonnet-5.5' }, { id: 'r3', model: 'auto' }
  ];
  const accounting = createUsageAccounting(requests);
  accounting.add(requests[0], usage(999999, 999), { fallback: true });
  const first = { model: 'gpt-5.3-codex', apiCallId: 'one', ...usage(1000, 100) };
  accounting.add(requests[0], first, { source: 'transcript' });
  accounting.add(requests[0], first, { source: 'debug', eventId: 'different-event' });
  accounting.add(requests[0], { model: first.model, ...usage(1000, 100), accounting: {
    sourceSessionId: 'session', usageId: 'one', sequence: 1
  } }, { source: 'debug', eventId: 'accounted-event' });
  accounting.add(requests[0], first, { source: 'transcript', checkpoint: true });
  const second = { model: 'claude-sonnet-5.5', ...usage(1000, 100) };
  accounting.add(requests[0], second, { source: 'transcript', timestamp: 10, eventId: 'a' });
  accounting.add(requests[0], second, { source: 'debug', timestamp: 10, eventId: 'b' });
  // Identical-token calls within the same source remain distinct.
  accounting.add(requests[1], second, { source: 'transcript', timestamp: 10, eventId: 'c' });
  accounting.add(requests[1], second, { source: 'transcript', timestamp: 10, eventId: 'd' });
  accounting.snapshot({ modelMetrics: { 'gpt-5.3-codex': { usage: usage(100000, 10000) } } }, 20);
  accounting.snapshot({ modelMetrics: { 'gpt-5.3-codex': { usage: usage(200000, 20000) } } }, 30);
  const result = accounting.finish();
  near(requests[0].usage.credits, 0.615);
  near(requests[1].usage.credits, 0.6);
  near(requests[1].usage.cumulativeCredits, 1.215);
  assert.equal(requests[2].usage.credits, null);
  assert.equal(requests[2].usage.cumulativePartial, true);
  assert.equal(result.callCount, 4);
  assert.equal(result.pricedTurns, 2);
  near(result.credits, 1.215);
  near(result.aggregate.credits, 63);
  assert.equal(result.aggregate.timestamp, 30);
});

test('Agent Host exposes per-turn and intermediate usage through session, detail and story APIs without editing input', async (t) => {
  const { root, save } = await fixture(t);
  const records = [
    { type: 'session.start', data: { selectedModel: 'gpt-5.3-codex' } },
    { id: 'u1', type: 'user.message', data: { content: 'First', interactionId: 'i1' } },
    { id: 'a1', type: 'assistant.message', data: { content: 'Working', model: 'gpt-5.3-codex' } },
    { id: 'c1', type: 'assistant.usage', data: { model: 'gpt-5.3-codex', apiCallId: 'c1', ...usage(1000, 100) } },
    { id: 'c2', type: 'assistant.usage', agentId: 'helper', data: { model: 'claude-sonnet-5.5', apiCallId: 'c2', initiator: 'sub-agent', ...usage(1000, 100) } },
    { id: 'u2', type: 'user.message', data: { content: 'Second', interactionId: 'i2' } },
    // Explicit interaction correlation overrides proximity.
    { id: 'c3', type: 'assistant.usage', data: { model: 'gpt-5.3-codex', interactionId: 'i1', apiCallId: 'c3', ...usage(1000, 100) } },
    { id: 'context', type: 'session.usage_info', data: { currentTokens: 8888 } },
    { id: 'checkpoint', type: 'session.usage_checkpoint', data: { totalNanoAiu: 1250000000 } },
    { id: 'end', type: 'session.shutdown', data: { modelMetrics: {
      'gpt-5.3-codex': { usage: usage(10000, 1000) }
    } } }
  ].map((record, index) => ({ timestamp: new Date(1730000000000 + index * 100).toISOString(), ...record }));
  const file = await save('agent\\events.jsonl', records.map(JSON.stringify).join('\n'));
  const original = await readFile(file);
  const session = await loadSession(file);
  near(session.requests[0].usage.credits, 0.93);
  assert.equal(session.requests[1].usage.credits, null);
  assert.deepEqual(session.requests[0].usage.models, ['gpt-5.3-codex', 'claude-sonnet-5.5']);
  assert.equal(session.requests[0].usage.calls[1].agent, 'helper');
  assert.equal(summarizeNode(session.requests[0]).usage.calls, undefined);
  assert.equal(storyPage(session).items[0].usage.calls.length, 3);
  near(summarizeSession(session).usage.credits, 0.93);
  assert.deepEqual(await readFile(file), original);
  const instance = await startServer({ port: 0, dataDir: root, loadSamples: false, paths: [file] });
  t.after(async () => {
    instance.library.close();
    await new Promise((resolve) => instance.server.close(resolve));
  });
  await instance.library.idle();
  const response = await fetch(`${instance.url}/api/sessions/${session.id}`);
  assert.equal(response.status, 200);
  const payload = await response.json();
  near(payload.usage.credits, 0.93);
  assert.equal(payload.usage.reported.nanoAiu, 1250000000);
  assert.equal(payload.usage.reported.aiUnits, 1.25);
  assert.equal(payload.usage.reported.snapshots[0].type, 'session.usage_checkpoint');
  assert.equal(payload.requests[0].usage.callCount, 3);
  const detail = await (await fetch(`${instance.url}/api/sessions/${session.id}/nodes/${payload.requests[0].id}`)).json();
  assert.equal(detail.usage.calls.length, 3);
  const story = await (await fetch(`${instance.url}/api/sessions/${session.id}/story`)).json();
  assert.ok(story.items.some((item) => item.kind === 'event' && item.usage?.model === 'claude-sonnet-5.5'));
  const reportResponse = await fetch(`${instance.url}/api/sessions/${session.id}/usage`);
  const report = await reportResponse.json();
  near(report.usd, 0.0093);
  assert.equal(report.reported.aiUnits, 1.25);
  assert.equal(report.turns.length, 2);
  assert.equal(report.turns[0].calls.length, 3);
  assert.equal(report.turns[1].credits, null);
  assert.equal(report.modelCredits.length, 2);
  const download = await fetch(`${instance.url}/api/sessions/${session.id}/usage/export`);
  assert.match(download.headers.get('content-disposition'), /-ai-credits\.md/);
  const markdown = await download.text();
  assert.match(markdown, /0\.93 AI credits/);
  assert.match(markdown, /\$0\.0093 USD/);
  assert.match(markdown, /## By model/);
  assert.match(markdown, /## By turn/);
  assert.match(markdown, /## Intermediate usage/);
  assert.match(markdown, /Latest session aggregate \(not added to turns\)/);
  assert.deepEqual(await readFile(file), original);
});

test('reported root checkpoints preserve zero and latest lower values, deduplicate sidecars and never add to estimates', () => {
  const accounting = createUsageAccounting([]);
  const meta = { type: 'session.usage_checkpoint', source: 'Transcript' };
  accounting.snapshot({ totalNanoAiu: 0 }, 1000, meta);
  assert.equal(accounting.finish().reported.aiUnits, 0);
  accounting.snapshot({ totalNanoAiu: 9000000000, modelMetrics: { 'gpt-5.3-codex': { usage: usage(1000, 100) } } }, 2000, meta);
  accounting.snapshot({ totalNanoAiu: 1 }, 3000, meta);
  accounting.snapshot({ totalNanoAiu: 1 }, new Date(3000).toISOString(), { ...meta, source: 'Debug log' });
  accounting.snapshot({ totalNanoAiu: 3000000000 }, 1500, meta);
  accounting.snapshot({ totalNanoAiu: 8000000000 }, 4000, { ...meta, agentId: 'helper' });
  for (const invalid of [-1, 0.5, '100', null, Number.MAX_SAFE_INTEGER + 1]) accounting.snapshot({ totalNanoAiu: invalid }, 5000, meta);
  const result = accounting.finish();
  assert.equal(result.credits, null);
  near(result.aggregate.credits, 0.315);
  assert.equal(result.aggregate.timestamp, 2000);
  assert.equal(result.reported.nanoAiu, 1);
  assert.equal(result.reported.aiUnits, 1e-9);
  assert.equal(result.reported.snapshots.length, 4);
  assert.deepEqual(result.reported.sources, ['Transcript', 'Debug log']);
  assert.match(result.reported.warnings.join(' '), /invalid or unsafe/);
  assert.match(result.reported.warnings.join(' '), /decreased/);
  accounting.snapshot({ totalNanoAiu: 8 }, undefined, meta);
  assert.equal(accounting.finish().reported.nanoAiu, 1);
  assert.match(accounting.finish().reported.warnings.join(' '), /timestamps/);
});

test('classic request totals are a fallback; correlated sidecar calls replace, rather than add to, totals', async (t) => {
  const { save } = await fixture(t);
  const file = await save('ws\\chatSessions\\classic.json', {
    sessionId: 'classic', requests: [
      { requestId: 'r1', timestamp: 1000, modelId: 'copilot/gpt-5.3-codex', promptTokens: 9999, completionTokens: 999, message: { text: 'First' }, response: [] },
      { requestId: 'r2', timestamp: 2000, modelId: 'copilot/claude-sonnet-5.5', ...usage(1000, 100), message: { text: 'Second' }, response: [] }
    ]
  });

  await save('ws\\GitHub.copilot-chat\\transcripts\\classic.jsonl', JSON.stringify({
    id: 'call', type: 'assistant.usage', timestamp: new Date(3000).toISOString(),
    data: { requestId: 'r1', model: 'gpt-5.3-codex', ...usage(1000, 100) }
  }));
  const session = await loadSession(file);
  near(session.requests[0].usage.credits, 0.315);
  near(session.requests[1].usage.credits, 0.3);
  near(session.usage.credits, 0.615);
  assert.equal(session.requests[0].usage.calls.length, 1);
});

test('missing prompt IDs use event order, while startup and unresolved interactions remain session-only usage', async (t) => {
  const { save } = await fixture(t);
  const file = await save('agent\\events.jsonl', [
    { type: 'session.start', data: { selectedModel: 'gpt-5.3-codex' } },
    { type: 'assistant.usage', data: { model: 'gpt-5.3-codex', ...usage(1000, 100) } },
    { type: 'user.message', data: { content: 'First' } },
    { type: 'assistant.usage', data: { model: 'gpt-5.3-codex', ...usage(1000, 100) } },
    { type: 'user.message', data: { content: 'Second' } },
    { type: 'assistant.usage', data: { model: 'gpt-5.3-codex', ...usage(2000, 200) } },
    { type: 'assistant.usage', data: { model: 'gpt-5.3-codex', interactionId: 'unknown', ...usage(1000, 100) } }
  ].map(JSON.stringify).join('\n'));
  const session = await loadSession(file);
  near(session.requests[0].usage.credits, 0.315);
  near(session.requests[1].usage.credits, 0.63);
  near(session.usage.attributedCredits, 0.945);
  near(session.usage.credits, 1.575);
  assert.equal(session.usage.unallocated.length, 2);
  const report = usageReportMarkdown(session);
  assert.equal(report.split('## Usage without a turn association').length, 2);
});

test('token bubbles and chart render exact credit values, proportionate bars, zero vs missing, and escape model labels', async () => {
  const text = await readFile(path.resolve('public/app.js'), 'utf8');
  const accountingRequests = [
    { id: 'r1', index: 1, model: 'gpt-5.3-codex' },
    { id: 'r2', index: 2, model: 'gpt-5.3-codex' },
    { id: 'r3', index: 3, model: '<img onerror="bad">' },
    { id: 'r4', index: 4, model: 'gpt-5.3-codex' }
  ];
  const accounting = createUsageAccounting(accountingRequests);
  accounting.add(accountingRequests[0], usage(1000, 100));
  accounting.add(accountingRequests[1], usage(2000, 200));
  accounting.add(accountingRequests[3], usage(0, 0));
  accounting.snapshot({ totalNanoAiu: 1 }, 3000, { source: '<img src=x onerror=bad>' });
  const sandbox = {
    state: { session: { requests: accountingRequests, usage: accounting.finish() } },
    Intl, icon: () => '', keyValues: (values) => JSON.stringify(values),
    escapeHtml: (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]),
    modelName: (value) => value || 'Not recorded', number: (value) => String(value),
    humanize: (value) => value, date: (value) => String(value)
  };
  vm.createContext(sandbox);
  vm.runInContext(text.slice(text.indexOf('function creditNumber('), text.indexOf('function renderOverview(')), sandbox);
  const html = vm.runInContext('creditChartHtml()', sandbox);
  assert.match(html, /width:50%/);
  assert.match(html, /width:100%/);
  assert.match(html, /0\.315/);
  assert.match(html, /0\.945/);
  assert.match(html, /&lt;img onerror=&quot;bad&quot;&gt;/);
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /Usage or price not recorded/);
  assert.match(html, /data-select="r4"[^>]*aria-label="[^"]*0 AI credits/);
  const bubble = vm.runInContext('tokenBubble(state.session.requests[0].usage)', sandbox);
  assert.match(bubble, /1100 tokens/);
  assert.match(bubble, /Credit components/);
  assert.match(bubble, /0\.175/);
  assert.match(bubble, /0\.14/);
  const reported = vm.runInContext('reportedConsumptionHtml(state.session.usage.reported)', sandbox);
  assert.match(reported, /0\.000000001/);
  assert.match(reported, /&lt;img src=x onerror=bad&gt;/);
  assert.doesNotMatch(reported, /<img/);
  Object.assign(sandbox, {
    chronicleMarkdown: { supportsLanguage: () => false },
    renderRecord: (value) => sandbox.escapeHtml(JSON.stringify(value)),
    relatedItems: () => ''
  });
  vm.runInContext(text.slice(text.indexOf('function codeBlock('), text.indexOf('function markdown(')), sandbox);
  vm.runInContext(text.slice(text.indexOf('function toolOutputsHtml('), text.indexOf('function renderDiff(')), sandbox);
  const output = vm.runInContext(`  renderTool({ raw: {}, duration: null, resultVariants: { modelFacing: '', detailed: '<img src=x onerror=bad>', blocks: [{type: 'resource', uri: 'https://example.invalid'}] } })`, sandbox);
  assert.match(output, /Model-facing result/);
  assert.match(output, /Saved empty string/);
  assert.match(output, /Saved detailed display output/);
  assert.match(output, /Structured result blocks/);
  assert.match(output, /&lt;img src=x onerror=bad&gt;/);
  assert.doesNotMatch(output, /<img|<iframe/);
  const legacy = vm.runInContext(`renderTool({ raw: {resultDetails: {output: 'Older undifferentiated output'}}, duration: null, resultVariants: {detailed: 'Additional display output'} })`, sandbox);
  assert.match(legacy, /Older undifferentiated output/);
  assert.match(legacy, /Additional display output/);
});
