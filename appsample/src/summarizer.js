import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { diffLines } from './diff.js';
import { collectText, textOf } from './parser.js';

const DEFAULT_AUTHORITY_HOST = 'https://login.microsoftonline.com';
const DEFAULT_TOKEN_SCOPE = 'https://ai.azure.com/.default';
const DEFAULT_MAX_CHUNK_CHARS = 80_000;
const MAX_JOBS = 30;

const ENV_KEY_MAP = [
  ['tenantId', 'AZURE_TENANT_ID'],
  ['clientId', 'AZURE_CLIENT_ID'],
  ['clientSecret', 'AZURE_CLIENT_SECRET'],
  ['agentEndpoint', 'FOUNDRY_AGENT_ENDPOINT'],
  ['agentName', 'FOUNDRY_AGENT_NAME'],
  ['outputDir', 'SUMMARY_OUTPUT_DIR'],
  ['lastTestedAt', 'FOUNDRY_LAST_TESTED_AT'],
  ['authorityHost', 'AZURE_AUTHORITY_HOST'],
  ['tokenScope', 'FOUNDRY_TOKEN_SCOPE']
];

export function parseEnvText(content = '') {
  const values = {};
  for (const rawLine of String(content).split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(trimmed);
    if (!match) continue;
    const [, key, rest] = match;
    let value = rest.trim();
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      value = value.slice(1, -1)
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    } else if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
      value = value.slice(1, -1);
    } else {
      const commentIndex = value.indexOf(' #');
      if (commentIndex >= 0) value = value.slice(0, commentIndex).trim();
    }
    values[key] = value;
  }
  return values;
}

export function formatEnvValue(value) {
  const str = String(value ?? '');
  if (!str) return '""';
  if (/^[A-Za-z0-9._:/@-]+$/.test(str)) return str;
  const escaped = str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
  return `"${escaped}"`;
}

export function updateEnvText(existingContent = '', updates = {}) {
  const lines = existingContent ? String(existingContent).split(/\r?\n/) : [];
  if (lines.length && lines.at(-1) === '') lines.pop();
  const seen = new Set();
  const updatedLines = lines.map((line) => {
    const match = /^(\s*(?:export\s+)?)([A-Za-z_][A-Za-z0-9_]*)(\s*=.*)$/.exec(line);
    if (!match) return line;
    const [, prefix, key] = match;
    if (!Object.hasOwn(updates, key)) return line;
    seen.add(key);
    const nextValue = updates[key];
    if (nextValue === undefined || nextValue === null) return null;
    return `${prefix}${key}=${formatEnvValue(nextValue)}`;
  }).filter((line) => line !== null);

  for (const [key, value] of Object.entries(updates)) {
    if (seen.has(key) || value === undefined || value === null) continue;
    updatedLines.push(`${key}=${formatEnvValue(value)}`);
  }
  return updatedLines.join('\n') + '\n';
}

function isLocalHttpUrl(parsed) {
  return parsed.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname);
}

export function resolveFoundryTarget(rawEndpoint, rawAgentName = '') {
  const endpointText = String(rawEndpoint || '').trim();
  const agentName = String(rawAgentName || '').trim();
  if (!endpointText) throw new Error('Microsoft Foundry Agent endpoint URL is required.');
  let parsed;
  try { parsed = new URL(endpointText); }
  catch { throw new Error('Microsoft Foundry Agent endpoint must be a valid URL.'); }
  if (parsed.protocol !== 'https:' && !isLocalHttpUrl(parsed)) {
    throw new Error('Microsoft Foundry Agent endpoint must use HTTPS (or http://127.0.0.1 for local testing).');
  }

  const pathname = parsed.pathname.replace(/\/+$/, '');

  // Classic Foundry Assistants API when an asst_* ID is provided on a project endpoint.
  if (/^asst_[A-Za-z0-9]+/.test(agentName) && !/\/responses$/i.test(pathname)) {
    const base = `${parsed.origin}${pathname}`;
    return {
      mode: 'classic-threads',
      baseUrl: base,
      apiVersion: parsed.searchParams.get('api-version') || '2025-05-01',
      assistantId: agentName
    };
  }

  // Full /responses endpoint already supplied (agent endpoint, published app endpoint, or project /openai/v1/responses).
  if (/\/responses$/i.test(pathname)) {
    const url = new URL(parsed.toString());
    url.pathname = pathname;
    if (!url.searchParams.has('api-version') && !/\/openai\/v1\/responses$/i.test(pathname)) {
      url.searchParams.set('api-version', 'v1');
    }
    const isProjectResponses = /\/openai\/v1\/responses$/i.test(pathname) && !/\/(agents|applications)\//i.test(pathname);
    return {
      mode: 'responses',
      url: url.toString(),
      agentReference: isProjectResponses && agentName ? { type: 'agent_reference', name: agentName } : null
    };
  }

  // Agent or Application OpenAI base URL ending with /protocols/openai or /openai/v1
  if (/\/protocols\/openai$/i.test(pathname) || /\/openai\/v1$/i.test(pathname)) {
    const url = new URL(parsed.toString());
    url.pathname = `${pathname}/responses`;
    if (!url.searchParams.has('api-version') && !/\/openai\/v1$/i.test(pathname)) {
      url.searchParams.set('api-version', 'v1');
    }
    const isProjectOpenAi = /\/openai\/v1$/i.test(pathname) && !/\/(agents|applications)\//i.test(pathname);
    if (isProjectOpenAi && !agentName) {
      throw new Error('Agent Name is required when using a project-level /openai/v1 endpoint.');
    }
    return {
      mode: 'responses',
      url: url.toString(),
      agentReference: isProjectOpenAi && agentName ? { type: 'agent_reference', name: agentName } : null
    };
  }

  // Agent resource URL ending with /agents/<name> or /agents/<name>/endpoint
  const agentResourceMatch = /^(.*\/agents\/[^/]+?)(?:\/endpoint)?$/i.exec(pathname);
  if (agentResourceMatch) {
    const url = new URL(parsed.origin);
    url.pathname = `${agentResourceMatch[1]}/endpoint/protocols/openai/responses`;
    url.searchParams.set('api-version', parsed.searchParams.get('api-version') || 'v1');
    return { mode: 'responses', url: url.toString(), agentReference: null };
  }

  // Foundry Project endpoint (e.g. https://<res>.services.ai.azure.com/api/projects/<project>)
  if (!agentName) {
    throw new Error('Enter the Agent Name, or paste the full Foundry Agent Responses endpoint URL.');
  }
  const primaryUrl = new URL(parsed.origin);
  primaryUrl.pathname = `${pathname}/agents/${encodeURIComponent(agentName)}/endpoint/protocols/openai/responses`;
  primaryUrl.searchParams.set('api-version', parsed.searchParams.get('api-version') || 'v1');

  const fallbackUrl = new URL(parsed.origin);
  fallbackUrl.pathname = `${pathname}/openai/v1/responses`;

  return {
    mode: 'responses',
    url: primaryUrl.toString(),
    agentReference: null,
    fallbackUrl: fallbackUrl.toString(),
    fallbackAgentReference: { type: 'agent_reference', name: agentName }
  };
}

export function validateSummaryConfig(config = {}) {
  const missing = [];
  if (!String(config.tenantId || '').trim()) missing.push('AZURE_TENANT_ID');
  if (!String(config.clientId || '').trim()) missing.push('AZURE_CLIENT_ID');
  if (!String(config.clientSecret || '').trim()) missing.push('AZURE_CLIENT_SECRET');
  if (!String(config.agentEndpoint || '').trim()) missing.push('FOUNDRY_AGENT_ENDPOINT');
  if (missing.length) {
    return { valid: false, missing, error: `Missing required .env configuration: ${missing.join(', ')}.` };
  }
  try {
    const target = resolveFoundryTarget(config.agentEndpoint, config.agentName);
    return { valid: true, missing: [], target, error: null };
  } catch (error) {
    if (error.message.includes('Agent Name')) missing.push('FOUNDRY_AGENT_NAME');
    return { valid: false, missing, error: error.message };
  }
}

export function sanitizeSummaryFileName(session) {
  const rawTitle = String(session?.title || '').trim();
  const usableTitle = rawTitle && rawTitle.toLowerCase() !== 'untitled session' ? rawTitle : String(session?.sessionId || session?.id || 'session');
  let slug = usableTitle
    .replace(/[<>:"/\\|?*\x00-\x1f]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.\s-]+|[.\s-]+$/g, '')
    .slice(0, 96)
    .replace(/[.\s-]+$/g, '');
  if (!slug) slug = String(session?.sessionId || session?.id || 'session').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) || 'session';
  slug = slug.replace(/-summary$/i, '');
  return `${slug}-summary.md`;
}

function redactSecrets(message, secrets = []) {
  let output = String(message ?? '');
  for (const secret of secrets) {
    if (secret && secret.length >= 4) output = output.split(secret).join('[REDACTED]');
  }
  output = output.replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]');
  return output;
}

function boundMiddle(text, maxChars, label = 'characters omitted for token efficiency') {
  const value = String(text ?? '').trim();
  if (value.length <= maxChars) return value;
  const head = Math.max(120, Math.floor(maxChars * 0.68));
  const tail = Math.max(80, maxChars - head - 60);
  const omitted = value.length - head - tail;
  return `${value.slice(0, head)}\n… [${omitted} ${label}] …\n${value.slice(value.length - tail)}`;
}

function portablePath(filePath, workspacePath) {
  const raw = String(filePath || '').trim();
  if (!raw) return '';
  const normFile = raw.replace(/\//g, '\\');
  const normWs = String(workspacePath || '').trim().replace(/\//g, '\\').replace(/\\+$/, '');
  if (normWs && normFile.toLowerCase().startsWith((normWs + '\\').toLowerCase())) {
    return normFile.slice(normWs.length + 1).replace(/\\/g, '/');
  }
  return raw.replace(/\\/g, '/');
}

function summarizeDiffCompact(before, after, maxLines = 18) {
  if (typeof before !== 'string' || typeof after !== 'string') return null;
  const parts = diffLines(before, after, { timeout: 600 });
  if (!parts) return { stats: `${before.split('\n').length} → ${after.split('\n').length} lines`, preview: '' };
  let added = 0;
  let removed = 0;
  const salient = [];
  for (const part of parts) {
    const lines = part.value.split('\n');
    if (lines.at(-1) === '') lines.pop();
    if (part.added) {
      added += lines.length;
      for (const line of lines) {
        if (salient.length < maxLines && line.trim()) salient.push(`+ ${line.trim().slice(0, 140)}`);
      }
    } else if (part.removed) {
      removed += lines.length;
      for (const line of lines) {
        if (salient.length < maxLines && line.trim()) salient.push(`- ${line.trim().slice(0, 140)}`);
      }
    }
  }
  return { added, removed, stats: `+${added} / -${removed} lines`, preview: salient.join('\n') };
}

function compactToolArguments(args) {
  if (args === undefined || args === null) return '';
  if (typeof args === 'string') return boundMiddle(args, 500);
  if (typeof args !== 'object') return String(args);
  const summary = {};
  for (const [key, val] of Object.entries(args)) {
    if (val === undefined || val === null || val === '') continue;
    if (typeof val === 'string') {
      if (/^(file_text|new_str|old_str|content|patch|code)$/i.test(key) && val.length > 260) {
        summary[key] = `${val.slice(0, 180)}… [${val.length} chars]`;
      } else {
        summary[key] = boundMiddle(val, 350);
      }
    } else if (Array.isArray(val)) {
      summary[key] = val.length > 8 ? [...val.slice(0, 8), `… +${val.length - 8} more`] : val;
    } else if (typeof val === 'object') {
      summary[key] = boundMiddle(JSON.stringify(val), 300);
    } else {
      summary[key] = val;
    }
  }
  return boundMiddle(JSON.stringify(summary), 650);
}

function extractToolResultText(toolNode) {
  const raw = toolNode.raw || {};
  const specific = raw.toolSpecificData || {};
  const pieces = [];

  if (specific.kind === 'subagent') {
    if (specific.prompt) pieces.push(`Subagent task: ${boundMiddle(specific.prompt, 600)}`);
    if (specific.result) pieces.push(`Subagent result: ${boundMiddle(specific.result, 1500)}`);
  }

  const output = raw.resultDetails?.output;
  if (Array.isArray(output)) {
    const outText = output.map((entry) => textOf(entry)).filter(Boolean).join('\n');
    if (outText) pieces.push(outText);
  } else if (typeof output === 'string' && output.trim()) {
    pieces.push(output);
  } else if (raw.resultDetails && !output) {
    const collected = collectText(raw.resultDetails, 1200);
    if (collected.trim()) pieces.push(collected);
  }

  // Check linked sidecar execution events for errors or missing outputs
  for (const eventChild of toolNode.children || []) {
    const data = eventChild.raw?.data || eventChild.raw?.attrs || {};
    if (data.error || data.success === false) {
      const errText = collectText(data.error || data, 600);
      if (errText) pieces.push(`Event error: ${errText}`);
    } else if (!pieces.length && eventChild.text) {
      pieces.push(eventChild.text);
    }
  }

  const joined = pieces.join('\n').trim();
  if (!joined) return '';
  const isHighSignal = toolNode.failed || specific.kind === 'subagent' ||
    /powershell|terminal|bash|test|run|build|lint|exec|cmd/i.test( `${toolNode.toolName || ''} ${toolNode.title || ''}` );
  return boundMiddle(joined, isHighSignal ? 1400 : 380);
}

function formatContextNode(ctxNode, workspacePath) {
  const raw = ctxNode.raw;
  if (!raw) return '';
  if (ctxNode.title === 'Response metadata & summaries') {
    const summaries = raw?.metadata?.summaries;
    if (Array.isArray(summaries) && summaries.length) {
      return summaries.map((s) => boundMiddle(textOf(s), 1800)).filter(Boolean).join('\n');
    }
    const errText = raw?.errorDetails?.message;
    if (errText) return `Response error: ${boundMiddle(errText, 600)}`;
    return '';
  }
  if (ctxNode.title === 'Prompt attachments & context') {
    const vars = raw?.variables || (Array.isArray(raw) ? raw : []);
    if (!Array.isArray(vars) || !vars.length) return '';
    const items = vars.map((v) => {
      const name = v?.name || v?.id || 'attachment';
      const target = portablePath(v?.value?.fsPath || v?.value?.path || '', workspacePath);
      return target ? `${name} (${target})` : name;
    }).slice(0, 20);
    return items.length ? `Attachments/Context: ${items.join(', ')}` : '';
  }
  if (ctxNode.title === 'Content references' && Array.isArray(raw)) {
    const refs = raw.map((entry) => portablePath(entry?.reference?.fsPath || entry?.reference?.path || entry?.reference?.external || '', workspacePath)).filter(Boolean);
    const unique = [...new Set(refs)].slice(0, 20);
    return unique.length ? `Referenced files/URIs: ${unique.join(', ')}` : '';
  }
  return '';
}

export function buildSessionDigest(session) {
  const wsPath = session.workspacePath || '';
  const isoOrUnknown = (ts) => {
    if (!ts) return 'Not recorded';
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? 'Not recorded' : d.toISOString();
  };

  const headerLines = [
    `=== SESSION METADATA ===`,
    `Title: ${session.title || 'Untitled session'}`,
    `Session ID: ${session.sessionId || session.id}`,
    `Created: ${isoOrUnknown(session.createdAt)}`,
    `Last Active: ${isoOrUnknown(session.lastAt)}`,
    `Workspace Name: ${session.workspaceName || 'Not recorded'}`,
    `Original Workspace Path: ${wsPath || 'Not recorded'}`,
    `Source File: ${path.basename(session.file || '')}`,
    `Connected Sources: session=${session.sources?.session || 'yes'}, transcriptEvents=${session.sources?.transcript || 0}, debugEvents=${session.sources?.debug || 0}, editingSnapshots=${Boolean(session.sources?.editing)}, modelCatalog=${Boolean(session.sources?.models)}`,
    `Activity Totals: ${session.stats?.prompts || 0} prompts, ${session.stats?.responses || 0} responses, ${session.stats?.tools || 0} tool calls, ${session.stats?.reasoning || 0} reasoning blocks, ${session.stats?.edits || 0} file edit operations`
  ];

  if (session.modelTimeline?.length) {
    headerLines.push(
      `Model Timeline: ` + session.modelTimeline.map((m) => {
        const cfg = m.configuration && Object.keys(m.configuration).length ? ` (${JSON.stringify(m.configuration)})` : '';
        return `Prompt #${m.prompt}: ${m.to}${cfg}`;
      }).join(' -> ')
    );
  }
  if (session.warnings?.length) {
    headerLines.push(`Source Reconstruction Warnings (${session.warnings.length}):\n` + session.warnings.slice(0, 15).map((w) => `  - ${w}`).join('\n'));
  }

  // Extract session-wide Saved file snapshots for exact net codebase state
  const snapshotLines = [];
  const snapshotGroup = (session.overview?.children || []).find((child) => child.title === 'Saved file snapshots');
  if (snapshotGroup?.children?.length) {
    snapshotLines.push(`=== SESSION-WIDE SAVED FILE SNAPSHOTS (${snapshotGroup.children.length} files) ===`);
    for (const snap of snapshotGroup.children.slice(0, 80)) {
      const rel = portablePath(snap.file || snap.title, wsPath);
      const action = snap.before === '' ? 'CREATED' : snap.after === '' ? 'DELETED' : 'MODIFIED';
      const diff = summarizeDiffCompact(snap.before, snap.after, 10);
      snapshotLines.push(`- [${action}] ${rel}${diff ? ` (${diff.stats})` : ''}${snap.model ? ` [model: ${snap.model}]` : ''}`);
      if (diff?.preview) {
        snapshotLines.push(diff.preview.split('\n').map((line) => `    ${line}`).join('\n'));
      }
    }
    if (snapshotGroup.children.length > 80) {
      snapshotLines.push(`- … and ${snapshotGroup.children.length - 80} additional snapshot files`);
    }
  }

  // Extract every turn with full fidelity & smart bounding
  const turnSections = [];
  for (const request of session.requests || []) {
    const rawReq = request.raw || {};
    const turnMeta = [
      `model=${request.model || 'unknown'}`,
      request.timestamp ? `at=${isoOrUnknown(request.timestamp)}` : null,
      rawReq.agent?.name ? `agent=${rawReq.agent.name}` : null,
      rawReq.modeInfo?.name || rawReq.modeInfo?.kind ? `mode=${rawReq.modeInfo.name || rawReq.modeInfo.kind}` : null,
      rawReq.promptTokens !== undefined ? `inTokens=${rawReq.promptTokens}` : null,
      rawReq.completionTokens !== undefined ? `outTokens=${rawReq.completionTokens}` : null,
      rawReq.elapsedMs !== undefined ? `elapsedMs=${rawReq.elapsedMs}` : null,
      request.hidden ? 'hiddenFromTranscript=true' : null
    ].filter(Boolean).join(', ');

    const lines = [
      `--- TURN ${String(request.index).padStart(2, '0')} (${turnMeta}) ---`,
      `[USER PROMPT]:\n${boundMiddle(request.text || '(Empty prompt)', 12_000)}`
    ];

    let unpersistedReasoningCount = 0;
    let toolIndex = 0;

    for (const child of request.children || []) {
      if (child.kind === 'reasoning') {
        if (child.available && child.text?.trim()) {
          lines.push(`[REASONING]:\n${boundMiddle(child.text, 2_500)}`);
        } else {
          unpersistedReasoningCount++;
        }
      } else if (child.kind === 'tool') {
        toolIndex++;
        const specific = child.raw?.toolSpecificData || {};
        const cmd = specific.commandLine?.original || (typeof specific.commandLine === 'string' ? specific.commandLine : '');
        const status = child.failed ? 'FAILED' : child.raw?.isComplete === false ? 'INCOMPLETE' : 'OK';
        const dur = child.duration !== null && child.duration !== undefined ? `, ${child.duration}ms` : '';
        const header = `[TOOL #${toolIndex}: ${child.toolName || 'tool'} | ${status}${dur}] ${boundMiddle(child.title || '', 220)}`;
        const details = [header];
        if (cmd) details.push(`  Command: ${boundMiddle(cmd, 500)}`);
        const argsText = compactToolArguments(child.arguments);
        if (argsText && argsText !== '{}') details.push(`  Args: ${argsText}`);
        const resText = extractToolResultText(child);
        if (resText) details.push(`  Result: ${resText.replace(/\n/g, '\n    ')}`);
        lines.push(details.join('\n'));
      } else if (child.kind === 'response') {
        if (child.text?.trim()) {
          lines.push(`[ASSISTANT RESPONSE]:\n${boundMiddle(child.text, 8_000)}`);
        }
      } else if (child.kind === 'edit' || child.kind === 'file') {
        const rel = portablePath(child.file || child.title, wsPath);
        lines.push(`[INLINE EDIT/FILE]: ${rel}`);
      } else if (child.kind === 'group' && child.source === 'Edit timeline') {
        const editSummaries = child.children.map((edit) => {
          const rel = portablePath(edit.file || edit.title, wsPath);
          const diff = summarizeDiffCompact(edit.before, edit.after, 6);
          return `  - ${edit.raw?.type || 'edit'} ${rel}${diff ? ` (${diff.stats})` : ''}${diff?.preview ? `\n${diff.preview.split('\n').map((l) => `      ${l}`).join('\n')}` : ''}`;
        });
        if (editSummaries.length) {
          lines.push(`[RECONSTRUCTED TURN FILE EDITS (${editSummaries.length})]:\n${boundMiddle(editSummaries.join('\n'), 3_500)}`);
        }
      } else if (child.kind === 'group' && (child.source === 'Agent transcript' || child.source === 'Debug log')) {
        // Surface only standalone error/warning diagnostics not already attached to tools
        const notableEvents = [];
        for (const ev of child.children || []) {
          const data = ev.raw?.data || ev.raw?.attrs || {};
          const isErr = data.error || data.level === 'error' || /error|exception|fail/i.test(ev.raw?.type || '');
          if (isErr && !data.toolCallId) {
            notableEvents.push(`  - [${child.source}] ${ev.title}: ${boundMiddle(collectText(data, 400), 350)}`);
          }
        }
        if (notableEvents.length) {
          lines.push(`[SIDECAR DIAGNOSTICS]:\n${notableEvents.slice(0, 10).join('\n')}`);
        }
      } else if (child.kind === 'context') {
        const formatted = formatContextNode(child, wsPath);
        if (formatted) lines.push(`[CONTEXT - ${child.title}]:\n${formatted}`);
      }
    }

    if (unpersistedReasoningCount > 0) {
      lines.push(`[NOTE]: ${unpersistedReasoningCount} reasoning block(s) in this turn had opaque/unpersisted text in VS Code storage.`);
    }
    turnSections.push(lines.join('\n\n'));
  }

  const headerBlock = headerLines.join('\n');
  const snapshotsBlock = snapshotLines.join('\n');
  const fullText = [headerBlock, snapshotsBlock, `=== CHRONOLOGICAL CONVERSATION & EXECUTION LOG ===`, ...turnSections]
    .filter(Boolean)
    .join('\n\n');

  return {
    headerBlock,
    snapshotsBlock,
    turnSections,
    fullText,
    approxTokens: Math.ceil(fullText.length / 4)
  };
}

export function chunkSessionDigest(digest, maxChunkChars = DEFAULT_MAX_CHUNK_CHARS) {
  if (digest.fullText.length <= maxChunkChars) {
    return [digest.fullText];
  }
  const chunks = [];
  const prefix = `${digest.headerBlock}\n\n`;
  const budget = Math.max(250, maxChunkChars - prefix.length - 120);
  let current = [];
  let currentLen = 0;

  const pushCurrent = () => {
    if (!current.length) return;
    chunks.push(`${prefix}${current.join('\n\n')}`);
    current = [];
    currentLen = 0;
  };

  for (const section of digest.turnSections) {
    if (section.length > budget) {
      pushCurrent();
      for (let offset = 0; offset < section.length; offset += budget) {
        const partNum = Math.floor(offset / budget) + 1;
        const totalParts = Math.ceil(section.length / budget);
        chunks.push(`${prefix}[Oversized Turn Slice ${partNum}/${totalParts}]\n${section.slice(offset, offset + budget)}`);
      }
      continue;
    }
    if (currentLen + section.length + 2 > budget && current.length) {
      pushCurrent();
    }
    current.push(section);
    currentLen += section.length + 2;
  }
  pushCurrent();
  return chunks.length ? chunks : [digest.fullText.slice(0, maxChunkChars)];
}

function buildFinalSummaryPrompt(session, digestBody, isSynthesis = false) {
  return [
    `MODE: FINAL_SESSION_SUMMARY`,
    `Generate a comprehensive yet token-efficient Markdown handoff summary document (${sanitizeSummaryFileName(session)}) for this VS Code chat session so an engineer or AI coding agent on another machine—with NO prior chat or session history—can ingest it and continue working effectively.`,
    `Include all critical context from user prompts, assistant responses, persisted reasoning, tool executions & results, terminal/test outcomes, errors/pitfalls, and reconstructed file changes (using portable repository-relative paths). Avoid unnecessary verbosity or filler prose.`,
    `Output ONLY valid Markdown starting with "# Session Handoff Summary: ". Do not wrap the entire document in outer triple-backtick fences.`,
    isSynthesis
      ? `Below are the session metadata, session-wide file snapshots, and chronological multi-part digests covering the entire session:`
      : `Below is the complete structured session digest:`,
    ``,
    digestBody
  ].join('\n');
}

function buildChunkDigestPrompt(session, chunkText, index, total) {
  return [
    `MODE: SESSION_CHUNK_DIGEST (Part ${index} of ${total})`,
    `Session: "${session.title || session.sessionId}"`,
    `Condense Part ${index} of ${total} of this VS Code chat session into a dense, lossless technical handoff digest (< 1,200 words).`,
    `Preserve ALL user instructions/changes, key reasoning insights, exact workspace-relative file paths created/modified/deleted, important tool commands & test/build results, errors encountered & how they were fixed, and unfinished state at the end of this part.`,
    ``,
    chunkText
  ].join('\n');
}

export function cleanMarkdownOutput(text) {
  let cleaned = String(text || '').trim();
  const outerFence = /^```(?:markdown|md)?\r?\n([\s\S]*?)\r?\n```$/i.exec(cleaned);
  if (outerFence) cleaned = outerFence[1].trim();
  return cleaned + '\n';
}

export function extractResponseText(payload) {
  if (!payload || typeof payload !== 'object') return '';
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text;
  }
  if (Array.isArray(payload.output)) {
    const parts = [];
    for (const item of payload.output) {
      if (typeof item?.text === 'string') parts.push(item.text);
      if (Array.isArray(item?.content)) {
        for (const contentPart of item.content) {
          if (typeof contentPart === 'string') parts.push(contentPart);
          else if (typeof contentPart?.text === 'string' && (!contentPart.type || /output_text|text/i.test(contentPart.type))) {
            parts.push(contentPart.text);
          } else if (typeof contentPart?.text?.value === 'string') {
            parts.push(contentPart.text.value);
          }
        }
      }
    }
    if (parts.length) return parts.join('\n').trim();
  }
  const chatChoice = payload.choices?.[0]?.message?.content;
  if (typeof chatChoice === 'string') return chatChoice;
  return '';
}

async function parseHttpPayload(response) {
  const rawText = await response.text();
  try { return { json: JSON.parse(rawText), text: rawText }; }
  catch { return { json: null, text: rawText }; }
}

function formatApiError(prefix, status, parsed) {
  const errObj = parsed?.json?.error;
  const errDesc = typeof parsed?.json?.error_description === 'string' ? parsed.json.error_description.trim() : '';
  const detail = typeof errObj === 'string'
    ? (errDesc ? `${errObj} — ${errDesc}` : errObj)
    : errObj?.message
      ? `${errObj.code ? `[${errObj.code}] ` : ''}${errObj.message}`
      : errDesc || parsed?.json?.message || (parsed?.text || '').slice(0, 500);
  return `${prefix} (HTTP ${status})${detail ? `: ${detail}` : ''}`;
}

export async function acquireEntraToken(config, { fetchImpl = fetch, signal } = {}) {
  const authority = String(config.authorityHost || process.env.AZURE_AUTHORITY_HOST || DEFAULT_AUTHORITY_HOST).replace(/\/+$/, '');
  const scope = String(config.tokenScope || process.env.FOUNDRY_TOKEN_SCOPE || DEFAULT_TOKEN_SCOPE).trim();
  const tokenUrl = `${authority}/${encodeURIComponent(config.tenantId.trim())}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: config.clientId.trim(),
    client_secret: config.clientSecret,
    scope,
    grant_type: 'client_credentials'
  });

  const response = await fetchImpl(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: body.toString(),
    signal
  });
  const parsed = await parseHttpPayload(response);
  if (!response.ok || !parsed.json?.access_token) {
    throw new Error(formatApiError('Entra ID Service Principal authentication failed', response.status, parsed));
  }
  return {
    accessToken: parsed.json.access_token,
    expiresIn: Number(parsed.json.expires_in || 3600),
    tokenUrl,
    scope
  };
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function invokeClassicThreads({ target, accessToken, prompt, log, fetchImpl, signal }) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };
  const qs = `api-version=${encodeURIComponent(target.apiVersion)}`;
  let threadId = null;
  try {
    const threadRes = await fetchImpl(`${target.baseUrl}/threads?${qs}`, { method: 'POST', headers, body: JSON.stringify({}), signal });
    const threadParsed = await parseHttpPayload(threadRes);
    if (!threadRes.ok || !threadParsed.json?.id) throw new Error(formatApiError('Failed to create Foundry thread', threadRes.status, threadParsed));
    threadId = threadParsed.json.id;

    const msgRes = await fetchImpl(`${target.baseUrl}/threads/${encodeURIComponent(threadId)}/messages?${qs}`, {
      method: 'POST', headers, body: JSON.stringify({ role: 'user', content: prompt }), signal
    });
    const msgParsed = await parseHttpPayload(msgRes);
    if (!msgRes.ok) throw new Error(formatApiError('Failed to post message to Foundry thread', msgRes.status, msgParsed));

    const runRes = await fetchImpl(`${target.baseUrl}/threads/${encodeURIComponent(threadId)}/runs?${qs}`, {
      method: 'POST', headers, body: JSON.stringify({ assistant_id: target.assistantId }), signal
    });
    const runParsed = await parseHttpPayload(runRes);
    if (!runRes.ok || !runParsed.json?.id) throw new Error(formatApiError('Failed to start Foundry agent run', runRes.status, runParsed));

    let run = runParsed.json;
    let attempts = 0;
    while (['queued', 'in_progress', 'cancelling'].includes(run.status) && attempts < 180) {
      await sleep(Math.min(2000, 500 + attempts * 200));
      attempts++;
      const pollRes = await fetchImpl(`${target.baseUrl}/threads/${encodeURIComponent(threadId)}/runs/${encodeURIComponent(run.id)}?${qs}`, { headers, signal });
      const pollParsed = await parseHttpPayload(pollRes);
      if (!pollRes.ok) throw new Error(formatApiError('Failed while polling Foundry agent run', pollRes.status, pollParsed));
      run = pollParsed.json;
    }
    if (run.status !== 'completed') {
      const reason = run.last_error?.message || `Run ended with status "${run.status}".`;
      throw new Error(`Foundry agent run did not complete: ${reason}`);
    }

    const listRes = await fetchImpl(`${target.baseUrl}/threads/${encodeURIComponent(threadId)}/messages?${qs}`, { headers, signal });
    const listParsed = await parseHttpPayload(listRes);
    if (!listRes.ok) throw new Error(formatApiError('Failed to retrieve Foundry agent messages', listRes.status, listParsed));
    const assistantMsg = (listParsed.json?.data || []).find((m) => m.role === 'assistant');
    const text = (assistantMsg?.content || []).map((c) => c?.text?.value || c?.text || '').join('\n').trim();
    if (!text) throw new Error('Foundry classic agent completed without returning text output.');
    log?.('info', 'foundry', `Received response (${text.length} chars) from classic agent ${target.assistantId}.`);
    return { text, endpointUsed: `${target.baseUrl}/threads/runs` };
  } finally {
    if (threadId) {
      await fetchImpl(`${target.baseUrl}/threads/${encodeURIComponent(threadId)}?${qs}`, { method: 'DELETE', headers }).catch(() => {});
    }
  }
}

export async function invokeFoundryResponses({ target, accessToken, prompt, log, fetchImpl = fetch, signal }) {
  if (target.mode === 'classic-threads') {
    return invokeClassicThreads({ target, accessToken, prompt, log, fetchImpl, signal });
  }

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };

  async function postOnce(url, agentReference) {
    const payload = {
      input: [{ role: 'user', content: prompt }]
    };
    if (agentReference) payload.agent_reference = agentReference;
    const response = await fetchImpl(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal
    });
    const parsed = await parseHttpPayload(response);
    return { response, parsed, url };
  }

  let attempt = await postOnce(target.url, target.agentReference);
  if (attempt.response.status === 404 && target.fallbackUrl) {
    log?.('warn', 'foundry', `Agent endpoint returned 404 at ${target.url}; retrying via project Responses endpoint ${target.fallbackUrl}.`);
    attempt = await postOnce(target.fallbackUrl, target.fallbackAgentReference);
  }

  if (!attempt.response.ok) {
    throw new Error(formatApiError('Microsoft Foundry Agent request failed', attempt.response.status, attempt.parsed));
  }

  let body = attempt.parsed.json;
  if (!body || typeof body !== 'object') {
    throw new Error('Microsoft Foundry Agent returned a non-JSON response.');
  }

  // Poll if response was accepted asynchronously
  let polls = 0;
  while ((body.status === 'in_progress' || body.status === 'queued') && body.id && polls < 180) {
    await sleep(Math.min(2000, 500 + polls * 200));
    polls++;
    const pollUrl = new URL(attempt.url);
    pollUrl.pathname = `${pollUrl.pathname.replace(/\/+$/, '')}/${encodeURIComponent(body.id)}`;
    const pollRes = await fetchImpl(pollUrl.toString(), { headers, signal });
    const pollParsed = await parseHttpPayload(pollRes);
    if (!pollRes.ok) throw new Error(formatApiError('Failed while polling Foundry response status', pollRes.status, pollParsed));
    body = pollParsed.json;
  }

  if (body.status === 'failed') {
    const code = body.error?.code ? `[${body.error.code}] ` : '';
    throw new Error(`Microsoft Foundry Agent reported failure: ${code}${body.error?.message || 'Unknown error'}`);
  }
  if (body.status === 'cancelled') {
    throw new Error('Microsoft Foundry Agent response was cancelled.');
  }
  if (body.status === 'incomplete') {
    log?.('warn', 'foundry', `Agent response marked incomplete (reason: ${body.incomplete_details?.reason || 'unspecified'}).`);
  }

  const text = extractResponseText(body);
  if (!text.trim()) {
    throw new Error('Microsoft Foundry Agent returned an empty response payload.');
  }
  return { text, endpointUsed: attempt.url, responseId: body.id || null, usage: body.usage || null };
}

export function createSummaryService({
  baseDir,
  getSession,
  fetchImpl = fetch,
  maxChunkChars = DEFAULT_MAX_CHUNK_CHARS
}) {
  const envPath = path.join(baseDir, '.env');
  const defaultOutputDir = path.join(baseDir, 'summaries');
  const jobs = new Map();
  let envWriteQueue = Promise.resolve();

  async function readRawEnv() {
    try { return await readFile(envPath, 'utf8'); }
    catch (error) {
      if (error.code === 'ENOENT') return '';
      throw error;
    }
  }

  async function loadConfig() {
    const raw = await readRawEnv();
    const parsed = parseEnvText(raw);
    const config = {};
    for (const [prop, envKey] of ENV_KEY_MAP) {
      config[prop] = parsed[envKey] ?? '';
    }
    return config;
  }

  function resolveOutputDir(config) {
    const custom = String(config.outputDir || '').trim();
    if (!custom) return defaultOutputDir;
    return path.isAbsolute(custom) ? custom : path.resolve(baseDir, custom);
  }

  async function getPublicConfig() {
    const config = await loadConfig();
    const validation = validateSummaryConfig(config);
    return {
      configured: validation.valid,
      missing: validation.missing,
      validationError: validation.error,
      tenantId: config.tenantId,
      clientId: config.clientId,
      hasClientSecret: Boolean(config.clientSecret),
      agentEndpoint: config.agentEndpoint,
      agentName: config.agentName,
      outputDir: config.outputDir,
      resolvedOutputDir: resolveOutputDir(config),
      envPath,
      lastTestedAt: config.lastTestedAt || null
    };
  }

  async function saveConfig(input = {}) {
    const saveOp = envWriteQueue.catch(() => {}).then(async () => {
      const raw = await readRawEnv();
      const existing = parseEnvText(raw);
      const nextSecret = typeof input.clientSecret === 'string' && input.clientSecret.trim()
        ? input.clientSecret.trim()
        : (input.clearSecret ? '' : (existing.AZURE_CLIENT_SECRET || ''));

      const tenantId = String(input.tenantId ?? existing.AZURE_TENANT_ID ?? '').trim();
      const clientId = String(input.clientId ?? existing.AZURE_CLIENT_ID ?? '').trim();
      const agentEndpoint = String(input.agentEndpoint ?? existing.FOUNDRY_AGENT_ENDPOINT ?? '').trim();
      const agentName = String(input.agentName ?? existing.FOUNDRY_AGENT_NAME ?? '').trim();
      const outputDir = String(input.outputDir ?? existing.SUMMARY_OUTPUT_DIR ?? '').trim();

      const credentialsChanged =
        tenantId !== (existing.AZURE_TENANT_ID || '') ||
        clientId !== (existing.AZURE_CLIENT_ID || '') ||
        nextSecret !== (existing.AZURE_CLIENT_SECRET || '') ||
        agentEndpoint !== (existing.FOUNDRY_AGENT_ENDPOINT || '') ||
        agentName !== (existing.FOUNDRY_AGENT_NAME || '');

      const updates = {
        AZURE_TENANT_ID: tenantId,
        AZURE_CLIENT_ID: clientId,
        AZURE_CLIENT_SECRET: nextSecret,
        FOUNDRY_AGENT_ENDPOINT: agentEndpoint,
        FOUNDRY_AGENT_NAME: agentName,
        SUMMARY_OUTPUT_DIR: outputDir || 'summaries'
      };
      if (input.authorityHost !== undefined) {
        updates.AZURE_AUTHORITY_HOST = String(input.authorityHost || '').trim() || undefined;
      }
      if (credentialsChanged && !input.lastTestedAt) {
        updates.FOUNDRY_LAST_TESTED_AT = '';
      } else if (input.lastTestedAt) {
        updates.FOUNDRY_LAST_TESTED_AT = input.lastTestedAt;
      }

      const candidate = {
        tenantId,
        clientId,
        clientSecret: nextSecret,
        agentEndpoint,
        agentName,
        outputDir: updates.SUMMARY_OUTPUT_DIR
      };
      const validation = validateSummaryConfig(candidate);
      if (!validation.valid) {
        const err = new Error(validation.error);
        err.status = 400;
        throw err;
      }

      await mkdir(path.dirname(envPath), { recursive: true });
      const content = updateEnvText(raw, updates);
      const tempPath = `${envPath}.${process.pid}.${randomUUID().slice(0, 8)}.tmp`;
      await writeFile(tempPath, content, { mode: 0o600 });
      await rename(tempPath, envPath);
    });
    envWriteQueue = saveOp;
    await saveOp;
    return getPublicConfig();
  }

  async function markTested(testedAt) {
    const op = envWriteQueue.catch(() => {}).then(async () => {
      const raw = await readRawEnv();
      if (!raw) return;
      const content = updateEnvText(raw, { FOUNDRY_LAST_TESTED_AT: testedAt });
      const tempPath = `${envPath}.${process.pid}.${randomUUID().slice(0, 8)}.tmp`;
      await writeFile(tempPath, content, { mode: 0o600 });
      await rename(tempPath, envPath);
    });
    envWriteQueue = op;
    await op;
  }

  async function testConnection(override = null) {
    const saved = await loadConfig();
    const merged = {
      tenantId: String(override?.tenantId ?? saved.tenantId ?? '').trim(),
      clientId: String(override?.clientId ?? saved.clientId ?? '').trim(),
      clientSecret: typeof override?.clientSecret === 'string' && override.clientSecret.trim()
        ? override.clientSecret.trim()
        : saved.clientSecret,
      agentEndpoint: String(override?.agentEndpoint ?? saved.agentEndpoint ?? '').trim(),
      agentName: String(override?.agentName ?? saved.agentName ?? '').trim(),
      authorityHost: String(override?.authorityHost ?? (saved.authorityHost || process.env.AZURE_AUTHORITY_HOST || '')).trim(),
      tokenScope: String(override?.tokenScope ?? (saved.tokenScope || process.env.FOUNDRY_TOKEN_SCOPE || '')).trim()
    };
    const secrets = [merged.clientSecret];
    const logs = [];
    const log = (level, step, message) => {
      logs.push({ timestamp: new Date().toISOString(), level, step, message: redactSecrets(message, secrets) });
    };

    const validation = validateSummaryConfig(merged);
    if (!validation.valid) {
      log('error', 'validate', validation.error);
      return { ok: false, stage: 'validate', error: validation.error, logs };
    }

    try {
      const authStart = Date.now();
      log('info', 'auth', `Acquiring Microsoft Entra ID token for tenant ${merged.tenantId} (client ${merged.clientId})...`);
      const token = await acquireEntraToken(merged, { fetchImpl, signal: AbortSignal.timeout(25_000) });
      secrets.push(token.accessToken);
      const authMs = Date.now() - authStart;
      log('info', 'auth', `Entra ID bearer token acquired in ${authMs} ms (scope: ${token.scope}).`);

      const agentStart = Date.now();
      log('info', 'agent', `Sending connectivity probe to ${validation.target.url || validation.target.baseUrl}...`);
      const result = await invokeFoundryResponses({
        target: validation.target,
        accessToken: token.accessToken,
        prompt: 'CONNECTION_TEST: Reply with READY to confirm Chronicle session summarizer connectivity.',
        log,
        fetchImpl,
        signal: AbortSignal.timeout(45_000)
      });
      const agentMs = Date.now() - agentStart;
      const preview = result.text.replace(/\s+/g, ' ').trim().slice(0, 140);
      log('info', 'agent', `Foundry Agent responded in ${agentMs} ms: "${preview}"`);

      const testedAt = new Date().toISOString();
      const matchesSaved =
        merged.tenantId === saved.tenantId &&
        merged.clientId === saved.clientId &&
        merged.clientSecret === saved.clientSecret &&
        merged.agentEndpoint === saved.agentEndpoint &&
        merged.agentName === saved.agentName;
      if (matchesSaved) await markTested(testedAt);

      return {
        ok: true,
        testedAt,
        authMs,
        agentMs,
        endpointUsed: result.endpointUsed,
        replyPreview: preview,
        savedTestedState: matchesSaved,
        logs
      };
    } catch (error) {
      const safeMessage = redactSecrets(error.message || String(error), secrets);
      log('error', 'connectivity', safeMessage);
      return { ok: false, stage: 'connectivity', error: safeMessage, logs };
    }
  }

  function pruneJobs() {
    while (jobs.size > MAX_JOBS) {
      const oldestKey = jobs.keys().next().value;
      jobs.delete(oldestKey);
    }
  }

  function serializeJob(job, { includeMarkdown = false } = {}) {
    const { markdown, secrets, ...rest } = job;
    return includeMarkdown ? { ...rest, markdown } : rest;
  }

  async function startSummaryJob(sessionId) {
    const config = await loadConfig();
    const validation = validateSummaryConfig(config);
    if (!validation.valid) {
      const err = new Error(`Summary configuration required in .env before creating a session summary. ${validation.error}`);
      err.status = 400;
      err.code = 'CONFIG_REQUIRED';
      throw err;
    }

    // Verify session exists upfront before launching background job
    const session = await getSession(sessionId);
    const fileName = sanitizeSummaryFileName(session);
    const outDir = resolveOutputDir(config);
    const outputPath = path.join(outDir, fileName);

    const jobId = randomUUID();
    const job = {
      id: jobId,
      sessionId: session.id,
      rawSessionId: session.sessionId,
      sessionTitle: session.title || 'Untitled session',
      fileName,
      outputPath,
      status: 'running',
      phase: 'extracting',
      progress: 5,
      message: 'Extracting prompts, responses, reasoning, tool calls, and file changes...',
      startedAt: Date.now(),
      completedAt: null,
      error: null,
      warningCount: 0,
      stats: null,
      logs: [],
      markdown: null,
      secrets: [config.clientSecret]
    };
    pruneJobs();
    jobs.set(jobId, job);

    const log = (level, step, message) => {
      if (level === 'warn') job.warningCount++;
      job.logs.push({
        timestamp: new Date().toISOString(),
        level,
        step,
        message: redactSecrets(message, job.secrets)
      });
    };

    log('info', 'init', `Started summary job ${jobId} for session "${job.sessionTitle}" (${session.sessionId}).`);
    log('info', 'init', `Target output file: ${outputPath}`);

    // Execute job asynchronously while updating progress & logs
    (async () => {
      try {
        if (session.warnings?.length) {
          log('warn', 'parser', `Session had ${session.warnings.length} source reconstruction warning(s); noted in digest.`);
          for (const warning of session.warnings.slice(0, 10)) log('warn', 'parser', warning);
        }

        const extractStart = Date.now();
        const digest = buildSessionDigest(session);
        const chunks = chunkSessionDigest(digest, maxChunkChars);
        job.stats = {
          prompts: session.stats?.prompts || 0,
          tools: session.stats?.tools || 0,
          reasoning: session.stats?.reasoning || 0,
          edits: session.stats?.edits || 0,
          digestChars: digest.fullText.length,
          approxInputTokens: digest.approxTokens,
          chunks: chunks.length
        };
        log(
          'info',
          'extract',
          `Constructed structured session digest in ${Date.now() - extractStart} ms: ${digest.fullText.length.toLocaleString()} chars (~${digest.approxTokens.toLocaleString()} est. tokens) across ${session.stats?.prompts || 0} prompt(s), ${session.stats?.tools || 0} tool call(s), ${session.stats?.reasoning || 0} reasoning block(s), and ${session.stats?.edits || 0} file edit(s) -> ${chunks.length} LLM pass(es).`
        );

        job.phase = 'authenticating';
        job.progress = 18;
        job.message = 'Authenticating Service Principal with Microsoft Entra ID...';
        log('info', 'auth', `Requesting Entra ID token for tenant ${config.tenantId} (client ${config.clientId})...`);

        const authStart = Date.now();
        let tokenState = await acquireEntraToken(config, { fetchImpl, signal: AbortSignal.timeout(30_000) });
        job.secrets.push(tokenState.accessToken);
        let tokenExpiresAt = Date.now() + Math.max(60, tokenState.expiresIn - 120) * 1000;
        log('info', 'auth', `Authenticated successfully in ${Date.now() - authStart} ms.`);

        const getFreshToken = async () => {
          if (Date.now() < tokenExpiresAt) return tokenState.accessToken;
          log('info', 'auth', 'Refreshing Entra ID access token...');
          tokenState = await acquireEntraToken(config, { fetchImpl, signal: AbortSignal.timeout(30_000) });
          job.secrets.push(tokenState.accessToken);
          tokenExpiresAt = Date.now() + Math.max(60, tokenState.expiresIn - 120) * 1000;
          return tokenState.accessToken;
        };

        let rawSummaryText;
        if (chunks.length === 1) {
          job.phase = 'summarizing';
          job.progress = 42;
          job.message = 'Generating handoff summary via Microsoft Foundry Agent...';
          const prompt = buildFinalSummaryPrompt(session, chunks[0], false);
          log('info', 'foundry', `Sending single-pass summary request (${prompt.length.toLocaleString()} chars) to Foundry Agent...`);
          const llmStart = Date.now();
          const result = await invokeFoundryResponses({
            target: validation.target,
            accessToken: await getFreshToken(),
            prompt,
            log,
            fetchImpl,
            signal: AbortSignal.timeout(180_000)
          });
          rawSummaryText = result.text;
          log('info', 'foundry', `Received summary (${rawSummaryText.length.toLocaleString()} chars) in ${Date.now() - llmStart} ms from ${result.endpointUsed}.${result.usage ? ` Token usage: ${JSON.stringify(result.usage)}` : ''}`);
        } else {
          job.phase = 'summarizing';
          const partSummaries = [];
          for (let index = 0; index < chunks.length; index++) {
            const partNum = index + 1;
            job.progress = 22 + Math.round(((index + 0.5) / (chunks.length + 1)) * 60);
            job.message = `Summarizing session part ${partNum} of ${chunks.length} via Microsoft Foundry Agent...`;
            const chunkPrompt = buildChunkDigestPrompt(session, chunks[index], partNum, chunks.length);
            log('info', 'foundry', `Sending chunk ${partNum}/${chunks.length} (${chunkPrompt.length.toLocaleString()} chars) to Foundry Agent...`);
            const stepStart = Date.now();
            const partResult = await invokeFoundryResponses({
              target: validation.target,
              accessToken: await getFreshToken(),
              prompt: chunkPrompt,
              log,
              fetchImpl,
              signal: AbortSignal.timeout(180_000)
            });
            log('info', 'foundry', `Chunk ${partNum}/${chunks.length} summarized (${partResult.text.length.toLocaleString()} chars) in ${Date.now() - stepStart} ms.`);
            partSummaries.push(`=== PART ${partNum} OF ${chunks.length} DIGEST ===\n${partResult.text.trim()}`);
          }

          job.phase = 'synthesizing';
          job.progress = 84;
          job.message = `Synthesizing unified handoff document from ${chunks.length} parts...`;
          const combinedBody = [
            digest.headerBlock,
            digest.snapshotsBlock,
            ...partSummaries
          ].filter(Boolean).join('\n\n');
          const synthPrompt = buildFinalSummaryPrompt(session, boundMiddle(combinedBody, maxChunkChars + 15_000), true);
          log('info', 'foundry', `Sending final synthesis pass (${synthPrompt.length.toLocaleString()} chars) to Foundry Agent...`);
          const synthStart = Date.now();
          const finalResult = await invokeFoundryResponses({
            target: validation.target,
            accessToken: await getFreshToken(),
            prompt: synthPrompt,
            log,
            fetchImpl,
            signal: AbortSignal.timeout(180_000)
          });
          rawSummaryText = finalResult.text;
          log('info', 'foundry', `Final handoff summary synthesized (${rawSummaryText.length.toLocaleString()} chars) in ${Date.now() - synthStart} ms.`);
        }

        job.phase = 'saving';
        job.progress = 94;
        job.message = `Saving ${fileName} to disk...`;
        const finalMarkdown = cleanMarkdownOutput(rawSummaryText);
        await mkdir(outDir, { recursive: true });
        const tempSummary = `${outputPath}.${process.pid}.${randomUUID().slice(0, 8)}.tmp`;
        await writeFile(tempSummary, finalMarkdown, 'utf8');
        await rename(tempSummary, outputPath);

        job.markdown = finalMarkdown;
        job.stats.outputChars = finalMarkdown.length;
        job.stats.approxOutputTokens = Math.ceil(finalMarkdown.length / 4);
        job.phase = 'completed';
        job.status = 'completed';
        job.progress = 100;
        job.completedAt = Date.now();
        job.message = `Summary saved to ${outputPath}`;
        log('info', 'save', `Wrote ${finalMarkdown.length.toLocaleString()} chars (~${job.stats.approxOutputTokens.toLocaleString()} est. tokens) to ${outputPath} in ${job.completedAt - job.startedAt} ms total.`);
      } catch (error) {
        const safeError = redactSecrets(error.message || String(error), job.secrets);
        job.status = 'failed';
        job.phase = 'failed';
        job.completedAt = Date.now();
        job.error = safeError;
        job.message = `Summary failed: ${safeError}`;
        log('error', 'failed', safeError);
      }
    })();

    return serializeJob(job);
  }

  function getJob(jobId, options) {
    const job = jobs.get(jobId);
    if (!job) return null;
    return serializeJob(job, options);
  }

  return {
    envPath,
    getPublicConfig,
    saveConfig,
    testConnection,
    startSummaryJob,
    getJob
  };
}
