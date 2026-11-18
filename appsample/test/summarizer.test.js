import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { loadSession } from '../src/parser.js';
import {
  buildSessionDigest,
  chunkSessionDigest,
  cleanMarkdownOutput,
  createSummaryService,
  parseEnvText,
  resolveFoundryTarget,
  sanitizeSummaryFileName,
  updateEnvText,
  validateSummaryConfig
} from '../src/summarizer.js';

async function tempDir(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'chronicle-sum-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

test('parses and updates .env preserving comments, unrelated keys, and special characters', () => {
  const initial = '# Existing comment\nPORT=3210\nAZURE_TENANT_ID=old-tenant\n';
  const updated = updateEnvText(initial, {
    AZURE_TENANT_ID: 'tenant-123',
    AZURE_CLIENT_SECRET: 's3cr3t#with spaces & "quotes"',
    FOUNDRY_AGENT_ENDPOINT: 'https://demo.services.ai.azure.com/api/projects/proj/agents/sum/endpoint/protocols/openai/responses?api-version=v1'
  });
  assert.match(updated, /# Existing comment/);
  assert.match(updated, /PORT=3210/);
  const parsed = parseEnvText(updated);
  assert.equal(parsed.PORT, '3210');
  assert.equal(parsed.AZURE_TENANT_ID, 'tenant-123');
  assert.equal(parsed.AZURE_CLIENT_SECRET, 's3cr3t#with spaces & "quotes"');
  assert.equal(
    parsed.FOUNDRY_AGENT_ENDPOINT,
    'https://demo.services.ai.azure.com/api/projects/proj/agents/sum/endpoint/protocols/openai/responses?api-version=v1'
  );
});

test('resolves Foundry agent endpoint formats and validates required configuration', () => {
  const direct = resolveFoundryTarget(
    'https://acct.services.ai.azure.com/api/projects/p1/agents/my-agent/endpoint/protocols/openai'
  );
  assert.equal(
    direct.url,
    'https://acct.services.ai.azure.com/api/projects/p1/agents/my-agent/endpoint/protocols/openai/responses?api-version=v1'
  );
  assert.equal(direct.agentReference, null);

  const projectScoped = resolveFoundryTarget('https://acct.services.ai.azure.com/api/projects/p1', 'my-agent');
  assert.equal(
    projectScoped.url,
    'https://acct.services.ai.azure.com/api/projects/p1/agents/my-agent/endpoint/protocols/openai/responses?api-version=v1'
  );
  assert.equal(projectScoped.fallbackUrl, 'https://acct.services.ai.azure.com/api/projects/p1/openai/v1/responses');
  assert.deepEqual(projectScoped.fallbackAgentReference, { type: 'agent_reference', name: 'my-agent' });

  const missingName = validateSummaryConfig({
    tenantId: 't',
    clientId: 'c',
    clientSecret: 's',
    agentEndpoint: 'https://acct.services.ai.azure.com/api/projects/p1'
  });
  assert.equal(missingName.valid, false);
  assert.ok(missingName.missing.includes('FOUNDRY_AGENT_NAME'));

  assert.equal(sanitizeSummaryFileName({ title: 'Node.js lidar: data / API?' }), 'Node.js-lidar-data-API-summary.md');
  assert.equal(sanitizeSummaryFileName({ title: 'Untitled session', sessionId: 'abc-123' }), 'abc-123-summary.md');
  assert.equal(cleanMarkdownOutput('```markdown\n# Title\n\nBody\n```'), '# Title\n\nBody\n');
});

test('builds comprehensive, token-bounded digest from multi-source session (prompts, reasoning, tools, subagents, edits, snapshots)', async (t) => {
  const dir = await tempDir(t);
  const wsRoot = path.join(dir, 'ws-multi');
  const save = async (rel, val) => {
    const file = path.join(wsRoot, rel);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, typeof val === 'string' ? val : JSON.stringify(val));
    return file;
  };

  const ts = 1730000000000;
  const resource = 'file:///c%3A/repos/demo/src/lidar.js';
  const uri = { external: resource, fsPath: 'c:\\repos\\demo\\src\\lidar.js' };
  await save('workspace.json', { folder: 'file:///c%3A/repos/demo' });
  const sessionFile = await save('chatSessions\\s-multi.jsonl', [
    {
      kind: 0,
      v: {
        sessionId: 's-multi',
        customTitle: 'Node.js lidar data downloader and API',
        creationDate: ts,
        requests: [
          {
            requestId: 'req-1',
            timestamp: ts,
            modelId: 'copilot/gpt-4.1',
            modelConfiguration: { reasoningEffort: 'high' },
            message: { text: 'Build the lidar downloader and add retry logic.' },
            variableData: { variables: [{ name: 'lidar.js', value: uri }] },
            result: { metadata: { summaries: [{ text: 'Initial downloader scaffolded with retry loop.' }] } },
            response: [
              { kind: 'thinking', value: 'Need exponential backoff on HTTP 429 and 503 responses.' },
              { kind: 'thinking', value: '' },
              {
                kind: 'toolInvocationSerialized',
                toolCallId: 'call-sub',
                toolId: 'task',
                pastTenseMessage: 'Ran explore subagent',
                isComplete: true,
                startedAt: ts,
                completedAt: ts + 120,
                toolSpecificData: {
                  kind: 'subagent',
                  prompt: 'Inspect existing HTTP retry helpers',
                  result: 'Found fetchWithRetry in src/http.js'
                }
              },
              {
                kind: 'toolInvocationSerialized',
                toolCallId: 'call-cmd',
                toolId: 'powershell',
                pastTenseMessage: 'Ran test suite',
                isComplete: true,
                toolSpecificData: { commandLine: { original: 'npm test' } },
                resultDetails: { isError: true, output: [{ isText: true, value: 'FAIL: timeout exceeded on tile 4' }] }
              },
              { value: 'Implemented retry backoff in `src/lidar.js` and diagnosed tile 4 timeout.' }
            ]
          },
          {
            requestId: 'req-2',
            timestamp: ts + 5000,
            modelId: 'copilot/o4-mini',
            message: { text: 'Fix tile 4 timeout and verify.' },
            response: [
              { kind: 'thinking', value: '' },
              { value: 'Increased tile stream timeout to 30s; all tests green.' }
            ]
          }
        ]
      }
    }
  ].map(JSON.stringify).join('\n'));

  await save('GitHub.copilot-chat\\transcripts\\s-multi.jsonl', [
    {
      type: 'assistant.message',
      timestamp: new Date(ts + 10).toISOString(),
      data: { toolRequests: [{ toolCallId: 'call-cmd', arguments: '{"command":"npm test","initial_wait":60}' }] }
    }
  ].map(JSON.stringify).join('\n'));

  await save('chatEditingSessions\\s-multi\\contents\\1111111', 'export function download() {}\n');
  await save('chatEditingSessions\\s-multi\\contents\\2222222', 'export async function downloadWithRetry() { return true; }\n');
  await save('chatEditingSessions\\s-multi\\state.json', {
    initialFileContents: [[resource, '1111111']],
    timeline: {
      operations: [
        {
          type: 'textEdit',
          uri,
          requestId: 'req-1',
          epoch: 1,
          edits: [{
            range: { startLineNumber: 1, startColumn: 1, endLineNumber: 2, endColumn: 1 },
            text: 'export async function downloadWithRetry() { return true; }\n'
          }]
        }
      ]
    },
    recentSnapshot: { entries: [{ resource, originalHash: '1111111', currentHash: '2222222' }] }
  });

  const session = await loadSession(sessionFile);
  const digest = buildSessionDigest(session);

  assert.match(digest.fullText, /=== SESSION METADATA ===/);
  assert.match(digest.fullText, /Title: Node\.js lidar data downloader and API/);
  // Portable workspace-relative path conversion
  assert.match(digest.fullText, /\[MODIFIED\] src\/lidar\.js/);
  // Reasoning, subagent, tool args, failed tool output, context summaries, and model switch all captured
  assert.match(digest.fullText, /exponential backoff on HTTP 429/);
  assert.match(digest.fullText, /Found fetchWithRetry in src\/http\.js/);
  assert.match(digest.fullText, /FAIL: timeout exceeded on tile 4/);
  assert.match(digest.fullText, /Initial downloader scaffolded with retry loop/);
  assert.match(digest.fullText, /copilot\/gpt-4\.1.*copilot\/o4-mini/);
  assert.match(digest.fullText, /1 reasoning block\(s\) in this turn had opaque\/unpersisted text/);

  const chunks = chunkSessionDigest(digest, 1_200);
  assert.ok(chunks.length >= 2);
});

test('enforces .env requirement, tests connectivity, runs multi-chunk summary, and logs problems safely', async (t) => {
  const dir = await tempDir(t);
  const requestsReceived = [];
  let failAgent = false;

  const mockServer = http.createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    requestsReceived.push({ url: req.url, headers: req.headers, body });

    if (req.url.endsWith('/oauth2/v2.0/token')) {
      const params = new URLSearchParams(body);
      if (params.get('client_secret') !== 'super-secret-value') {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid_client', error_description: 'Bad secret provided' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ access_token: 'mock-access-token-xyz', expires_in: 3600 }));
      return;
    }

    if (failAgent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'InternalError', message: 'Simulated upstream failure with super-secret-value' } }));
      return;
    }

    const payload = JSON.parse(body);
    const promptText = payload.input?.[0]?.content || '';
    const reply = promptText.startsWith('CONNECTION_TEST:')
      ? 'READY'
      : promptText.startsWith('MODE: SESSION_CHUNK_DIGEST')
        ? '### Chunk Digest\n- Captured prompts, reasoning, tool calls, and edits.'
        : '# Session Handoff Summary: Fixture Task\n\n## 1. Session Metadata\n- Complete handoff ready.';

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id: 'resp_1', status: 'completed', output_text: reply, usage: { total_tokens: 420 } }));
  });

  await new Promise((resolve) => mockServer.listen(0, '127.0.0.1', resolve));
  t.after(() => mockServer.close());
  const port = mockServer.address().port;

  // Create a synthetic session with prompt, reasoning, tool call, response, and edit
  const sessionDir = path.join(dir, 'ws', 'chatSessions');
  await mkdir(sessionDir, { recursive: true });
  const sessionFile = path.join(sessionDir, 's1.json');
  await writeFile(sessionFile, JSON.stringify({
    sessionId: 's1',
    customTitle: 'Fixture Task',
    requests: [
      {
        requestId: 'r1',
        timestamp: 1730000000000,
        modelId: 'copilot/gpt-4.1',
        message: { text: 'Implement feature alpha and run unit tests' },
        response: [
          { kind: 'thinking', value: 'We should inspect alpha.js before editing.' },
          {
            kind: 'toolInvocationSerialized',
            toolCallId: 'tc1',
            toolId: 'powershell',
            pastTenseMessage: 'Ran npm test',
            isComplete: true,
            toolSpecificData: { commandLine: { original: 'npm test' } },
            resultDetails: { output: [{ isText: true, value: '12 passing' }] }
          },
          { value: 'Feature alpha is implemented and verified.' }
        ]
      },
      {
        requestId: 'r2',
        timestamp: 1730000060000,
        modelId: 'copilot/gpt-4.1',
        message: { text: 'Prepare detailed handoff notes for windows laptop. ' + 'Include module architecture and edge cases. '.repeat(20) },
        response: [{ value: 'Ready for handoff. ' + 'Documented validation steps and remaining API tasks. '.repeat(20) }]
      }
    ]
  }));
  const loaded = await loadSession(sessionFile);

  const service = createSummaryService({
    baseDir: dir,
    getSession: async () => loaded,
    maxChunkChars: 900 // Force multi-chunk map-reduce path
  });

  // 1. Before configuring .env, summary creation is blocked
  const initialCfg = await service.getPublicConfig();
  assert.equal(initialCfg.configured, false);
  await assert.rejects(() => service.startSummaryJob(loaded.id), /Summary configuration required in \.env/);

  // 2. Save configuration to .env and verify secret is never exposed in public config
  const savedCfg = await service.saveConfig({
    tenantId: 'tenant-guid-1',
    clientId: 'client-guid-1',
    clientSecret: 'super-secret-value',
    agentEndpoint: `http://127.0.0.1:${port}/api/projects/demo`,
    agentName: 'chronicle-summarizer',
    authorityHost: `http://127.0.0.1:${port}`
  });
  assert.equal(savedCfg.configured, true);
  assert.equal(savedCfg.hasClientSecret, true);
  assert.equal('clientSecret' in savedCfg, false);
  const envOnDisk = await readFile(path.join(dir, '.env'), 'utf8');
  assert.match(envOnDisk, /AZURE_TENANT_ID=tenant-guid-1/);
  assert.match(envOnDisk, /FOUNDRY_AGENT_NAME=chronicle-summarizer/);

  // Updating another field with blank secret preserves existing secret
  const updatedCfg = await service.saveConfig({
    tenantId: 'tenant-guid-1',
    clientId: 'client-guid-1',
    clientSecret: '',
    agentEndpoint: `http://127.0.0.1:${port}/api/projects/demo`,
    agentName: 'chronicle-summarizer'
  });
  assert.equal(updatedCfg.hasClientSecret, true);

  // 3. Connectivity test succeeds and records lastTestedAt
  const testResult = await service.testConnection();
  assert.equal(testResult.ok, true);
  assert.equal(testResult.replyPreview, 'READY');
  assert.ok((await service.getPublicConfig()).lastTestedAt);

  // 4. Multi-chunk summary job completes, includes reasoning & tool results in prompts, and writes <session-name>-summary.md
  const started = await service.startSummaryJob(loaded.id);
  assert.equal(started.fileName, 'Fixture-Task-summary.md');

  let finalJob = started;
  for (let i = 0; i < 50 && finalJob.status === 'running'; i++) {
    await new Promise((r) => setTimeout(r, 50));
    finalJob = service.getJob(started.id, { includeMarkdown: true });
  }
  assert.equal(finalJob.status, 'completed');
  assert.ok(finalJob.stats.chunks >= 2);
  const writtenMd = await readFile(finalJob.outputPath, 'utf8');
  assert.match(writtenMd, /# Session Handoff Summary: Fixture Task/);
  const llmBodies = requestsReceived.filter((r) => r.url.includes('/responses')).map((r) => r.body).join('\n');
  assert.match(llmBodies, /inspect alpha\.js before editing/);
  assert.match(llmBodies, /npm test/);
  assert.match(llmBodies, /12 passing/);

  // 5. Failed agent execution logs problem and redacts secrets
  failAgent = true;
  const failedStart = await service.startSummaryJob(loaded.id);
  let failedJob = failedStart;
  for (let i = 0; i < 50 && failedJob.status === 'running'; i++) {
    await new Promise((r) => setTimeout(r, 50));
    failedJob = service.getJob(failedStart.id);
  }
  assert.equal(failedJob.status, 'failed');
  assert.match(failedJob.error, /InternalError/);
  assert.equal(failedJob.error.includes('super-secret-value'), false);
  assert.ok(failedJob.logs.some((entry) => entry.level === 'error'));
  assert.ok(failedJob.logs.every((entry) => !entry.message.includes('super-secret-value') && !entry.message.includes('mock-access-token-xyz')));
});
