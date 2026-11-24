import { createHash } from 'node:crypto';
import path from 'node:path';
import { pricing } from './usage.js';

const statKeys = ['prompts', 'responses', 'tools', 'edits', 'reasoning', 'events'];
const tokenKeys = ['input', 'cached', 'cacheWrite', 'output', 'reasoning'];
export function workspaceIdentity(session) {
  const paths = /^[a-z]:|^\\\\/i.test(session.file || '') ? path.win32 : path;
  const source = session.workspacePath || session.workspace || paths.dirname(paths.dirname(session.file));
  let key = String(source).replace(/\\/g, '/').replace(/\/+$/, '');
  if (/^[a-z]:/i.test(key) || key.startsWith('//')) key = key.toLowerCase();
  return createHash('sha256').update(key).digest('hex').slice(0, 20);
}

function sumKnown(items, key) {
  const values = items.map((item) => item?.[key]);
  return values.length && values.every((value) => typeof value === 'number' && Number.isFinite(value))
    ? values.reduce((sum, value) => sum + value, 0) : null;
}

export function rollupUsage(items) {
  const priced = items.filter((item) => item?.credits !== null && item?.credits !== undefined);
  const credits = priced.length ? priced.reduce((sum, item) => sum + item.credits, 0) : null;
  const models = new Map();
  for (const item of items) {
    for (const model of item?.modelCredits || []) {
      if (!models.has(model.model)) models.set(model.model, []);
      models.get(model.model).push(model);
    }
  }
  return {
    credits, usd: credits === null ? null : credits * pricing.usdPerCredit,
    partial: !items.length || priced.length !== items.length || items.some((item) => item?.partial),
    tokens: Object.fromEntries(tokenKeys.map((key) => [key, sumKnown(items.map((item) => item?.tokens), key)])),
    callCount: items.reduce((sum, item) => sum + (item?.callCount || 0), 0),
    pricedTurns: items.reduce((sum, item) => sum + (item?.pricedTurns || 0), 0),
    modelCredits: [...models].map(([model, groups]) => ({
      model, ...rollupModel(groups)
    })),
    pricing: { checkedAt: pricing.checkedAt, source: pricing.source, usdPerCredit: pricing.usdPerCredit }
  };
}
function rollupModel(items) {
  const priced = items.filter((item) => item.credits !== null);
  const credits = priced.length ? priced.reduce((sum, item) => sum + item.credits, 0) : null;
  return {
    credits, usd: credits === null ? null : credits * pricing.usdPerCredit,
    callCount: items.reduce((sum, item) => sum + (item.callCount || 0), 0),
    partial: priced.length !== items.length || items.some((item) => item.partial),
    tokens: Object.fromEntries(tokenKeys.map((key) => [key, sumKnown(items.map((item) => item.tokens), key)]))
  };
}

export function workspaceOverview(id, sessions) {
  const members = sessions.filter((session) => workspaceIdentity(session) === id);
  if (!members.length) { const error = new Error('Workspace not found.'); error.status = 404; throw error; }
  members.sort((a, b) => (a.createdAt || a.lastAt || 0) - (b.createdAt || b.lastAt || 0) || a.id.localeCompare(b.id));
  const ready = members.filter((session) => session.status === 'ready');
  const first = members.find((session) => session.workspacePath) || members[0];
  const models = new Set(ready.flatMap((session) => [
    ...(session.modelTimeline || []).map((item) => item.to),
    ...(session.usage?.modelCredits || []).map((item) => item.model)
  ]));
  const stats = Object.fromEntries(statKeys.map((key) => [key, ready.reduce((sum, session) => sum + (session.stats?.[key] || 0), 0)]));
  const usage = rollupUsage(members.map((session) => session.usage));
  const aggregateMembers = ready.filter((session) => session.usage?.aggregate);
  const aggregate = rollupUsage(aggregateMembers.map((session) => session.usage.aggregate));
  const reportedMembers = ready.filter((session) => session.usage?.reported?.nanoAiu !== null && session.usage?.reported?.nanoAiu !== undefined);
  const reportedNanoAiu = reportedMembers.reduce((sum, session) => sum + session.usage.reported.nanoAiu, 0);
  const reportedWarnings = members.flatMap((session) => (session.usage?.reported?.warnings || []).map((warning) => `${session.title}: ${warning}`));
  if (!Number.isSafeInteger(reportedNanoAiu)) reportedWarnings.push('The workspace consumption sum exceeds the safe numeric range. Inspect raw per-session totals instead.');
  const reported = {
    nanoAiu: reportedMembers.length && Number.isSafeInteger(reportedNanoAiu) ? reportedNanoAiu : null,
    aiUnits: reportedMembers.length && Number.isSafeInteger(reportedNanoAiu) ? reportedNanoAiu / 1e9 : null,
    coveredSessions: reportedMembers.length, totalSessions: members.length,
    partial: reportedMembers.length !== members.length || !Number.isSafeInteger(reportedNanoAiu),
    warnings: reportedWarnings
  };
  const timestamps = members.flatMap((session) => [session.createdAt, session.lastAt]).filter(Number.isFinite);
  return {
    id, sessionId: id, scope: 'workspace',
    title: first.workspaceName || 'Other sessions', workspaceName: first.workspaceName || 'Other sessions',
    workspacePath: first.workspacePath || '', file: '', sources: {},
    createdAt: timestamps.length ? Math.min(...timestamps) : undefined,
    lastAt: timestamps.length ? Math.max(...timestamps) : undefined,
    sessionCount: members.length, indexedCount: ready.length,
    pendingCount: members.filter((session) => session.status === 'pending').length,
    failedCount: members.filter((session) => session.status === 'error').length,
    size: members.reduce((sum, session) => sum + (session.size || 0), 0),
    stats: { ...stats, models: models.size }, models: [...models],
    usage: { ...usage, aggregate: aggregateMembers.length ? aggregate : null, aggregateSessions: aggregateMembers.length, reported },
    warnings: members.flatMap((session) => [
      ...(session.warnings || []).map((warning) => `${session.title}: ${warning}`),
      ...(session.error ? [`${session.title}: ${session.error}`] : [])
    ]),
    sessions: members
  };
}

export function workspaceReport(workspace) {
  const amount = (value) => value === null || value === undefined ? 'Unavailable' : Number(value.toFixed(8)).toString();
  const text = (value) => String(value ?? '').replace(/[\r\n|]/g, ' ').replace(/[<>]/g, '');
  return [
    `# Workspace usage: ${text(workspace.title)}`, '',
    `Path: ${text(workspace.workspacePath) || 'Not recorded'}`,
    `Sessions: ${workspace.sessionCount}; indexed: ${workspace.indexedCount}; pending: ${workspace.pendingCount}; failed: ${workspace.failedCount}.`,
    `Prompts: ${workspace.stats.prompts}; tools: ${workspace.stats.tools}; edits: ${workspace.stats.edits}; reasoning blocks: ${workspace.stats.reasoning}.`, '',
    `Recorded priced usage: ${amount(workspace.usage.credits)} AI credits / $${amount(workspace.usage.usd)} USD${workspace.usage.partial ? ' (incomplete)' : ''}.`,
    `Tokens: ${Object.entries(workspace.usage.tokens).map(([key, value]) => `${key}=${amount(value)}`).join(', ')}.`,
    'Reference-price estimates only. Missing usage is not zero; reasoning is included in output.',
    `Separate runtime-reported consumption: ${workspace.usage.reported?.aiUnits ?? 'Unavailable'} AI units / ${workspace.usage.reported?.nanoAiu ?? 'Unavailable'} nano-AIU; coverage ${workspace.usage.reported?.coveredSessions ?? 0}/${workspace.sessionCount} sessions.`,
    'Only the latest cumulative checkpoint per session is counted. AI units are nano-AIU / 1e9; no currency or AI-credit conversion is assumed. Missing coverage is not zero. Checkpoints may predate final activity and cannot reconstruct missing per-turn consumption.',
    `Pricing: ${workspace.usage.pricing.source} (checked ${workspace.usage.pricing.checkedAt}).`, '',
    '## Models', '', '| Model | Entries | AI credits | USD |', '| --- | ---: | ---: | ---: |',
    ...workspace.usage.modelCredits.map((item) => `| ${text(item.model)}${item.partial ? ' *' : ''} | ${item.callCount} | ${amount(item.credits)} | ${amount(item.usd)} |`),
    '', '## Sessions', '', '| Session | ID | Prompts | Tools | Estimated AI credits | Estimated USD | Reported nano-AIU | Status |', '| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |',
    ...workspace.sessions.map((session) => `| ${text(session.title)} | ${session.id} | ${session.stats?.prompts ?? 'Unavailable'} | ${session.stats?.tools ?? 'Unavailable'} | ${amount(session.usage?.credits)} | ${amount(session.usage?.usd)} | ${session.usage?.reported?.nanoAiu ?? 'Unavailable'} | ${session.status}${session.usage?.partial ? ' / incomplete usage' : ''} |`),
    '', workspace.usage.aggregate
      ? `Separate latest session snapshots (${workspace.usage.aggregateSessions} sessions): ${amount(workspace.usage.aggregate.credits)} AI credits / $${amount(workspace.usage.aggregate.usd)} USD. These overlap recorded turn usage and are NOT added to it.`
      : 'No session-wide aggregate snapshots recorded.',
    '', ...[...workspace.warnings, ...(workspace.usage.reported?.warnings || [])].map((warning) => `Warning: ${text(warning)}`), ''
  ].join('\n');
}
