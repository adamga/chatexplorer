import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { discover, loadSession, detailNode, detailNodeAsync, parseWorkspaceYaml } from '../src/parser.js';
import { createLibrary } from '../src/library.js';
import { buildSessionDigest } from '../src/summarizer.js';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'chronicle-agent-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  async function save(relative, value) {
    const file = path.join(root, relative);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, typeof value === 'string' ? value : JSON.stringify(value));
    return file;
  }
  return { root, save };
}

test('parseWorkspaceYaml parses quoted, escaped, numeric, boolean, and plain fields safely', () => {
  const parsed = parseWorkspaceYaml([
    '# comment',
    'id: 03a77592-c538-417c-b794-f397e3ea4543',
    'cwd: c:\\repos\\chatexplorer',
    'client_name: vscode-agent-host',
    'name: "Line one\\r\\nLine \\"two\\""',
    "summary: 'Single ''quoted'' title'",
    'user_named: false',
    'summary_count: 2',
    '__proto__: polluted'
  ].join('\n'));

  assert.equal(parsed.id, '03a77592-c538-417c-b794-f397e3ea4543');
  assert.equal(parsed.cwd, 'c:\\repos\\chatexplorer');
  assert.equal(parsed.client_name, 'vscode-agent-host');
  assert.equal(parsed.name, 'Line one\r\nLine "two"');
  assert.equal(parsed.summary, "Single 'quoted' title");
  assert.equal(parsed.user_named, false);
  assert.equal(parsed.summary_count, 2);
  assert.equal({}.polluted, undefined);
});

test('discovers and parses .copilot/session-state alongside workspaceStorage sessions', async (t) => {
  const { root, save } = await fixture(t);

  // Classic workspaceStorage session
  await save('workspaceStorage\\hash-1\\workspace.json', { folder: 'file:///c%3A/repos/chatexplorer' });
  await save('workspaceStorage\\hash-1\\chatSessions\\classic-1.jsonl', JSON.stringify({
    kind: 0,
    v: {
      sessionId: 'classic-1',
      customTitle: 'Classic Editor Chat',
      creationDate: 1730000000000,
      requests: [{ requestId: 'r1', timestamp: 1730000000000, modelId: 'copilot/gpt-4.1', message: { text: 'Hello from classic chat' }, response: [{ value: 'Classic reply' }] }]
    }
  }) + '\n');

  // Agent Host / Copilot CLI session-state directory (plus lock dir & empty stub dir)
  await save('.copilot\\session-state\\.session-operation-locks\\abc.lock', '');
  await save('.copilot\\session-state\\stub-without-events\\workspace.yaml', 'id: stub-without-events\ncwd: c:\\repos\\chatexplorer\n');

  const sessionDir = '.copilot\\session-state\\agent-uuid-1';
  const yamlPath = await save(`${sessionDir}\\workspace.yaml`, [
    'id: agent-uuid-1',
    'cwd: c:\\repos\\chatexplorer.worktrees\\wt-1',
    'repository: adamga/chatexplorer',
    'client_name: vscode-agent-host',
    'last_client_name: vscode-agent-host',
    'summary: "Build Agent Host support and sorting"',
    'created_at: 2026-11-16T13:07:17.695Z',
    'updated_at: 2026-11-17T09:05:00.000Z'
  ].join('\n'));
  await save(`${sessionDir}\\vscode.metadata.json`, {
    worktreeProperties: { repositoryPath: 'c:\\repos\\chatexplorer' }
  });
  await save(`${sessionDir}\\plan.md`, '# Implementation Plan\n- Parse events.jsonl\n');
  await save(`${sessionDir}\\checkpoints\\001-handoff.md`, '# Checkpoint 1\nParser complete.\n');
  await save(`${sessionDir}\\checkpoints\\index.md`, '# Checkpoint History\n| # | Title | File |\n|---|---|---|\n');

  const bigAsset = 'A'.repeat(4096);
  const eventsPath = await save(`${sessionDir}\\events.jsonl`, [
    {
      type: 'session.start',
      id: 'ev-1',
      timestamp: '2026-11-16T13:07:17.788Z',
      data: {
        sessionId: 'agent-uuid-1',
        producer: 'copilot-agent',
        selectedModel: 'gemini-4-carbon',
        reasoningEffort: 'medium',
        contextTier: 'long_context',
        context: { cwd: 'C:\\repos\\chatexplorer' }
      }
    },
    {
      type: 'session.binary_asset',
      id: 'ev-asset',
      timestamp: '2026-11-16T13:07:20.000Z',
      data: { assetId: 'img-1', mimeType: 'image/png', byteLength: 4096, data: bigAsset }
    },
    {
      type: 'user.message',
      id: 'ev-2',
      timestamp: '2026-11-16T13:07:31.000Z',
      data: { content: 'Add Agent Host session support', messageId: 'm-1', agentMode: 'autopilot', turnId: '0' }
    },
    {
      type: 'assistant.message',
      id: 'ev-3',
      timestamp: '2026-11-16T13:07:40.000Z',
      data: {
        messageId: 'am-1',
        model: 'gemini-4-carbon',
        reasoningText: 'Inspecting parser.js to support events.jsonl.',
        content: 'Checking parser.js and adding support.',
        toolRequests: [
          { toolCallId: 'tc-edit', name: 'edit', toolTitle: 'Editing parser.js', arguments: { path: 'C:\\repos\\chatexplorer\\src\\parser.js', old_str: 'const v = 1;\n', new_str: 'const v = 2;\n' } },
          { toolCallId: 'tc-cmd', name: 'powershell', toolTitle: 'Run unit tests', arguments: { command: 'npm test', description: 'Run unit tests' } },
          { toolCallId: 'tc-done', name: 'task_complete', toolTitle: 'Complete task', arguments: { summary: 'Agent Host support verified and complete.' } }
        ]
      }
    },
    {
      type: 'tool.execution_start',
      id: 'ev-4',
      timestamp: '2026-11-16T13:07:41.000Z',
      data: { toolCallId: 'tc-edit', toolName: 'edit', arguments: { path: 'C:\\repos\\chatexplorer\\src\\parser.js', old_str: 'const v = 1;\n', new_str: 'const v = 2;\n' } }
    },
    {
      type: 'tool.execution_complete',
      id: 'ev-5',
      timestamp: '2026-11-16T13:07:41.250Z',
      data: { toolCallId: 'tc-edit', success: true, result: { content: 'File updated' } }
    },
    {
      type: 'tool.execution_start',
      id: 'ev-6',
      timestamp: '2026-11-16T13:07:42.000Z',
      data: { toolCallId: 'tc-cmd', toolName: 'powershell', arguments: { command: 'npm test', description: 'Run unit tests' } }
    },
    {
      type: 'tool.execution_complete',
      id: 'ev-7',
      timestamp: '2026-11-16T13:07:45.500Z',
      data: { toolCallId: 'tc-cmd', success: true, shellExecution: { exitCode: 0 }, result: JSON.stringify({ content: 'All 18 tests passed' }) }
    },
    {
      type: 'session.model_change',
      id: 'ev-8',
      timestamp: '2026-11-16T13:07:46.000Z',
      data: { previousModel: 'gemini-4-carbon', newModel: 'gpt-5.3-codex', reasoningEffort: 'high' }
    },
    {
      type: 'tool.execution_start',
      id: 'ev-9',
      timestamp: '2026-11-16T13:07:47.000Z',
      data: { toolCallId: 'tc-done', toolName: 'task_complete', arguments: { summary: 'Agent Host support verified and complete.' } }
    },
    {
      type: 'tool.execution_complete',
      id: 'ev-10',
      timestamp: '2026-11-16T13:07:47.050Z',
      data: { toolCallId: 'tc-done', success: true, result: { content: 'Agent Host support verified and complete.' } }
    }
  ].map(JSON.stringify).join('\n'));

  // Discover via session-state folder, workspace.yaml pointer, and root containing both sources
  assert.deepEqual(await discover(path.join(root, '.copilot', 'session-state')), [eventsPath]);
  assert.deepEqual(await discover(yamlPath), [eventsPath]);
  const bothDiscovered = await discover(root);
  assert.equal(bothDiscovered.length, 2);

  // Parse Agent Host session and verify full fidelity
  const parsed = await loadSession(eventsPath);
  assert.equal(parsed.sessionFormat, 'agent-host');
  assert.equal(parsed.clientName, 'vscode-agent-host');
  assert.equal(parsed.title, 'Build Agent Host support and sorting');
  assert.equal(parsed.workspaceName, 'chatexplorer');
  assert.equal(parsed.stats.prompts, 1);
  assert.equal(parsed.stats.tools, 3);
  assert.equal(parsed.stats.reasoning, 1);
  assert.equal(parsed.stats.edits, 1);
  assert.deepEqual(parsed.modelTimeline.map((m) => m.to), ['gemini-4-carbon', 'gpt-5.3-codex']);

  const allNodes = [...parsed.nodes.values()];
  const editNode = allNodes.find((n) => n.kind === 'edit');
  assert.ok(editNode);
  assert.ok(detailNode(editNode).diff.some((d) => d.added && d.value.includes('const v = 2;')));

  const cmdTool = allNodes.find((n) => n.kind === 'tool' && n.toolName === 'powershell');
  assert.equal(cmdTool.duration, 3500);
  assert.equal(cmdTool.raw.toolSpecificData.commandLine.original, 'npm test');
  assert.match(cmdTool.raw.resultDetails.output[0].value, /All 18 tests passed/);

  // Lazy rawRef re-reads full binary_asset line from disk on demand
  const assetEventNode = allNodes.find((n) => n.kind === 'event' && n.title.includes('session.binary_asset'));
  const loadedAsset = await detailNodeAsync(parsed, assetEventNode);
  assert.equal(loadedAsset.raw.data.data.length, 4096);

  // Library indexes both workspaceStorage & .copilot/session-state together under "chatexplorer"
  const library = createLibrary({ cacheDir: path.join(root, '.cache'), indexerArgs: [] });
  t.after(() => library.close());
  await library.addPath(path.join(root, 'workspaceStorage'));
  await library.addPath(path.join(root, '.copilot', 'session-state'));
  await library.idle();
  const listed = library.list();
  assert.equal(listed.sessions.length, 2);
  assert.ok(listed.sessions.every((s) => s.workspaceName === 'chatexplorer'));
  assert.equal(library.search('All 18 tests passed').total, 1);

  // Summarizer builds portable digest from Agent Host session
  const digest = buildSessionDigest(parsed);
  assert.match(digest.fullText, /Inspecting parser\.js to support events\.jsonl/);
  assert.match(digest.fullText, /src\/parser\.js/);
  assert.match(digest.fullText, /Agent Host support verified and complete/);
});
