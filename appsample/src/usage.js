import pricing from './copilot-pricing.json' with { type: 'json' };

export { pricing };
const count = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;
const modelKey = (value) => String(value || '').toLowerCase().replace(/^copilot\//, '').replace(/[\s_]+/g, '-');
const tokenKeys = ['input', 'output', 'cached', 'cacheWrite', 'reasoning'];

export function normalizeUsage(data) {
  if (!data || typeof data !== 'object') return null;
  const raw = data.usage || data.tokenUsage || data;
  const input = raw.inputTokens ?? raw.promptTokens ?? raw.prompt_tokens ?? raw.input_tokens;
  const output = raw.outputTokens ?? raw.completionTokens ?? raw.completion_tokens ?? raw.output_tokens;
  if (input === undefined && output === undefined) return null;
  const cached = raw.cacheReadTokens ?? raw.cache_read_input_tokens ?? raw.input_tokens_details?.cached_tokens ?? raw.prompt_tokens_details?.cached_tokens;
  const cacheWrite = raw.cacheWriteTokens ?? raw.cache_creation_input_tokens;
  const anthropic = raw.input_tokens !== undefined && (raw.cache_read_input_tokens !== undefined || raw.cache_creation_input_tokens !== undefined);
  const tokens = {
    input: count(input), output: count(output), cached: count(cached), cacheWrite: count(cacheWrite),
    reasoning: count(raw.reasoningTokens ?? raw.output_tokens_details?.reasoning_tokens ?? raw.completion_tokens_details?.reasoning_tokens)
  };
  tokens.invalid = [input, output, cached, cacheWrite].some((value) => value !== undefined && count(value) === null);
  // Anthropic's native input_tokens excludes cache reads/writes; normalized Copilot/OpenAI input includes them.
  if (anthropic && tokens.input !== null) {
    tokens.input += (tokens.cached ?? 0) + (tokens.cacheWrite ?? 0);
    if (!Number.isSafeInteger(tokens.input)) tokens.input = null;
  }
  return tokens;
}

export function priceUsage(model, tokens, { aggregate = false, now = new Date().toISOString().slice(0, 10), byok = false } = {}) {
  const notes = [];
  const key = modelKey(model);
  const entry = Object.hasOwn(pricing.models, key) ? pricing.models[key] : null;
  let rates = entry?.rates;
  let tier = 'Default';
  if (entry?.validUntil && now >= entry.validUntil) {
    rates = entry.afterRates;
    if (!rates) notes.push('Promotional rate expired; refresh the local pricing file.');
  }
  if (entry?.threshold) {
    if (aggregate) notes.push('Aggregate usage has no per-call context sizes; default-tier estimate only.');
    else if (tokens.input > entry.threshold) { rates = entry.longRates; tier = 'Long context'; }
  }
  if (byok) notes.push('Bring-your-own-key usage is not GitHub AI credit consumption.');
  if (!entry) notes.push('No published rate in the local snapshot for this model.');
  if (tokens.input === null || tokens.output === null) notes.push('Input or output token count is missing or invalid.');
  if (tokens.invalid) notes.push('A recorded token count is invalid.');
  if (tokens.cached === null || tokens.cacheWrite === null) notes.push('Cache counts not recorded; estimate assumes no unreported cache usage.');
  const cached = tokens.cached ?? 0;
  const cacheWrite = tokens.cacheWrite ?? 0;
  if (tokens.input !== null && cached + cacheWrite > tokens.input) notes.push('Cache counts exceed total input; token semantics are inconsistent.');
  if (cacheWrite && rates?.[2] === 0) notes.push('Cache-write pricing is not published for this model.');
  const valid = rates && !byok && !tokens.invalid && tokens.input !== null && tokens.output !== null && cached + cacheWrite <= tokens.input && !(cacheWrite && rates[2] === 0);
  const components = valid ? {
    input: (tokens.input - cached - cacheWrite) * rates[0] / pricing.tokensPerUnit / pricing.usdPerCredit,
    cached: cached * rates[1] / pricing.tokensPerUnit / pricing.usdPerCredit,
    cacheWrite: cacheWrite * rates[2] / pricing.tokensPerUnit / pricing.usdPerCredit,
    output: tokens.output * rates[3] / pricing.tokensPerUnit / pricing.usdPerCredit
  } : null;
  const credits = components ? Object.values(components).reduce((sum, value) => sum + value, 0) : null;
  return { credits, usd: credits === null ? null : credits * pricing.usdPerCredit, components, tier, notes, partial: notes.length > 0 };
}

function summarize(calls) {
  const priced = calls.filter((call) => call.credits !== null);
  const sumTokens = (items, key) => {
    if (!items.length || items.some((call) => call.tokens[key] === null)) return null;
    return count(items.reduce((sum, call) => sum + call.tokens[key], 0));
  };
  const tokens = Object.fromEntries(tokenKeys.map((key) => [key, sumTokens(calls, key)]));
  const models = [...new Set(calls.map((call) => call.model))];
  const modelCredits = models.map((model) => {
    const items = priced.filter((call) => call.model === model);
    const group = calls.filter((call) => call.model === model);
    const credits = items.length ? items.reduce((sum, call) => sum + call.credits, 0) : null;
    return {
      model, credits, usd: credits === null ? null : credits * pricing.usdPerCredit, callCount: group.length,
      tokens: Object.fromEntries(tokenKeys.map((key) => [key, sumTokens(group, key)])),
      partial: items.length !== group.length || group.some((call) => call.partial)
    };
  });
  const credits = priced.length ? priced.reduce((sum, call) => sum + call.credits, 0) : null;
  return {
    tokens, models, modelCredits, callCount: calls.length,
    credits, usd: credits === null ? null : credits * pricing.usdPerCredit,
    partial: !calls.length || priced.length !== calls.length || calls.some((call) => call.partial)
  };
}

export function compactUsage(usage) {
  if (!usage) return undefined;
  const { calls, ...compact } = usage;
  return compact;
}

export function createUsageAccounting(requests) {
  const calls = new Map();
  const fallback = new Map();
  const identities = new Map();
  const fingerprints = new Map();
  let aggregate = null;
  const reportedSnapshots = new Map();
  const reportedWarnings = new Set();
  const epoch = (value) => typeof value === 'number' ? value : Date.parse(value);

  function add(owner, data, meta = {}) {
    if (meta.checkpoint) return null;
    const tokens = normalizeUsage(data);
    if (!tokens) return null;
    const model = data.model || data.modelId || owner?.model || 'Not recorded';
    const call = {
      model, tokens, source: meta.source, timestamp: meta.timestamp,
      label: data.interactionType || data.initiator || meta.label || 'Model call',
      agent: meta.agentId || data.agentId || null,
      ...priceUsage(model, tokens, { aggregate: !!meta.fallback, byok: data.isByok || !!data.byokKind })
    };
    if (!owner) {
      call.notes.push('No persisted turn association; included only in the session summary.');
      call.partial = true;
    }
    if (meta.fallback) { fallback.set(owner.id, call); return call; }
    const accounting = data.accounting;
    const aliases = [
      accounting?.usageId ? `accounting:${accounting.sourceSessionId}:${accounting.usageId}` : null,
      accounting?.usageId ? `api:${accounting.usageId}` : null,
      data.apiCallId ? `api:${data.apiCallId}` : null,
      data.providerCallId ? `provider:${data.providerCallId}` : null,
      data.messageId ? `message:${data.messageId}` : null
    ].filter(Boolean);
    const hasCallIdentity = aliases.length > 0;
    if (meta.eventId) aliases.push(`event:${meta.eventId}`);
    const existing = aliases.map((alias) => identities.get(alias)).find(Boolean);
    if (existing) {
      for (const alias of aliases) identities.set(alias, existing);
      return existing;
    }
    const fingerprint = JSON.stringify([owner?.id, model, tokens, meta.timestamp, call.agent]);
    if (!hasCallIdentity && fingerprints.has(fingerprint) && fingerprints.get(fingerprint).source !== meta.source) {
      const existing = fingerprints.get(fingerprint);
      existing.partial = true;
      const note = 'Matching sidecar timestamp and tokens treated as one usage entry; no shared call ID was recorded.';
      if (!existing.notes.includes(note)) existing.notes.push(note);
      return existing;
    }
    for (const alias of aliases) identities.set(alias, call);
    fingerprints.set(fingerprint, call);
    const ownerId = owner?.id || null;
    if (!calls.has(ownerId)) calls.set(ownerId, []);
    calls.get(ownerId).push(call);
    return call;
  }

  function snapshot(data, timestamp, meta = {}) {
    if (meta.agentId) return;
    if (Object.hasOwn(data, 'totalNanoAiu')) {
      const nanoAiu = count(data.totalNanoAiu);
      if (nanoAiu === null) reportedWarnings.add('A runtime consumption checkpoint had an invalid or unsafe nano-AIU count and was not used.');
      else {
        const key = JSON.stringify([Number.isFinite(epoch(timestamp)) ? epoch(timestamp) : timestamp ?? null, nanoAiu, meta.type || 'Session aggregate']);
        const existing = reportedSnapshots.get(key);
        const source = meta.source || 'Session checkpoint / shutdown';
        if (existing) {
          if (!existing.sources.includes(source)) existing.sources.push(source);
        } else reportedSnapshots.set(key, {
          nanoAiu, aiUnits: nanoAiu / 1e9, timestamp: timestamp ?? null,
          type: meta.type || 'Session aggregate', sources: [source], eventId: meta.eventId || null,
          totalPremiumRequests: count(data.totalPremiumRequests)
        });
      }
    }
    const metrics = data.providerModelMetrics?.length
      ? data.providerModelMetrics.map((item) => [item.modelId, item.metrics, item.provider])
      : Object.entries(data.modelMetrics || {}).map(([model, value]) => [model, value, null]);
    const items = [];
    for (const [model, metric, provider] of metrics) {
      const tokens = normalizeUsage(metric);
      if (!tokens) continue;
      items.push({ model: model || 'Not recorded', tokens, label: 'Session aggregate', source: 'Session checkpoint / shutdown',
        ...priceUsage(model, tokens, { aggregate: true, byok: provider?.kind && provider.kind !== 'copilot' }) });
    }
    if (items.length && (!aggregate || !Number.isFinite(epoch(timestamp)) ||
      !Number.isFinite(epoch(aggregate.timestamp)) || epoch(timestamp) >= epoch(aggregate.timestamp))) {
      aggregate = { ...summarize(items), timestamp, calls: items };
    }
  }

  function finish() {
    let cumulative = 0;
    let cumulativePartial = false;
    const all = [];
    for (const owner of requests) {
      const items = calls.get(owner.id) || (fallback.has(owner.id) ? [fallback.get(owner.id)] : []);
      const usage = summarize(items);
      cumulative += usage.credits ?? 0;
      cumulativePartial ||= usage.partial;
      owner.usage = { ...usage, cumulativeCredits: cumulative, cumulativePartial, calls: items };
      all.push(...items);
    }
    const attributedCredits = summarize(all).credits;
    const unallocated = calls.get(null) || [];
    all.push(...unallocated);
    const snapshots = [...reportedSnapshots.values()].sort((a, b) => {
      const first = epoch(a.timestamp), second = epoch(b.timestamp);
      if (Number.isFinite(first) && Number.isFinite(second)) return first - second;
      return Number.isFinite(first) ? 1 : Number.isFinite(second) ? -1 : 0;
    });
    if (snapshots.some((item) => !Number.isFinite(epoch(item.timestamp)))) reportedWarnings.add('Some checkpoints lack valid timestamps. Dated checkpoints take precedence; otherwise saved processing order is used. Recency may be uncertain.');
    if (snapshots.some((item, index) => index > 0 && item.nanoAiu < snapshots[index - 1].nanoAiu)) reportedWarnings.add('The saved consumption counter decreased between checkpoints. The latest value is shown, not the maximum or sum.');
    const latest = snapshots.at(-1);
    const reported = {
      nanoAiu: latest?.nanoAiu ?? null, aiUnits: latest?.aiUnits ?? null,
      timestamp: latest?.timestamp ?? null, sources: latest?.sources || [],
      snapshots, warnings: [...reportedWarnings],
      note: 'Runtime-reported cumulative consumption, separate from reference-price estimates. 1 AI unit = 1,000,000,000 nano-AIU. Not an invoice; no USD or AI-credit conversion is assumed. Checkpoints may predate final activity and cannot reconstruct missing per-turn consumption.'
    };
    return {
      ...summarize(all), pricedTurns: requests.filter((item) => item.usage.credits !== null).length,
      totalTurns: requests.length, partial: !all.length || cumulativePartial || unallocated.length > 0,
      attributedCredits, unallocated, aggregate, reported,
      pricing: { source: pricing.source, checkedAt: pricing.checkedAt, usdPerCredit: pricing.usdPerCredit }
    };
  }
  return { add, snapshot, finish };
}

export function sessionUsageReport(session) {
  return {
    sessionId: session.sessionId, title: session.title, ...session.usage,
    turns: session.requests.map((request) => ({
      index: request.index, requestId: request.requestId, title: request.title, timestamp: request.timestamp,
      ...request.usage, cumulativeUsd: request.usage.cumulativeCredits * pricing.usdPerCredit
    }))
  };
}

export function usageReportMarkdown(session) {
  const report = sessionUsageReport(session);
  const text = (value) => String(value ?? '').replace(/[\r\n]+/g, ' ').replace(/[\\`*_<>\[\]|#]/g, '\\$&');
  const amount = (value) => value === null || value === undefined ? 'Unavailable' : Number(value.toFixed(8)).toString();
  const tokens = (value) => value === null ? 'Not recorded' : String(value);
  const lines = [
    `# AI credit summary: ${text(report.title)}`, '',
    `Session: ${text(report.sessionId)}`, '',
    `Recorded priced usage: **${amount(report.credits)} AI credits**, **$${amount(report.usd)} USD** (reference-price estimate${report.partial ? ', incomplete' : ''}).`,
    `Turn-attributed subtotal: ${amount(report.attributedCredits)} AI credits. Unallocated usage entries: ${report.unallocated.length}.`,
    `Priced turns: ${report.pricedTurns}/${report.totalTurns}. Recorded usage entries: ${report.callCount}.`, '',
    `Input: ${tokens(report.tokens.input)}; cached input: ${tokens(report.tokens.cached)}; cache write: ${tokens(report.tokens.cacheWrite)}; output: ${tokens(report.tokens.output)}; reasoning (included in output): ${tokens(report.tokens.reasoning)}.`, '',
    `Pricing: ${report.pricing.source} (checked ${report.pricing.checkedAt}); 1 AI credit = $${report.pricing.usdPerCredit} USD.`,
    'Missing counts are not zero. Unknown models, missing usage, cache assumptions and unknown per-call context tiers can leave estimates incomplete. Reference rates do not reproduce historical invoices, plan discounts or legacy premium-request billing.', '',
    '## Runtime-reported consumption (separate from estimates)', '',
    `Latest saved cumulative consumption: ${report.reported?.aiUnits ?? 'Unavailable'} AI units; ${report.reported?.nanoAiu ?? 'Unavailable'} nano-AIU.`,
    report.reported?.note || 'No runtime consumption checkpoint recorded.',
    ...((report.reported?.snapshots || []).length ? [
      '', '| Saved at | Event | Nano-AIU | AI units | Source |',
      '| --- | --- | ---: | ---: | --- |',
      ...report.reported.snapshots.map((item) => `| ${text(item.timestamp ?? 'Not recorded')} | ${text(item.type)} | ${item.nanoAiu} | ${item.aiUnits} | ${item.sources.map(text).join(', ')} |`),
      '', 'Checkpoints are cumulative: use the latest, never their sum. They cannot reconstruct missing per-turn consumption.'
    ] : []),
    ...(report.reported?.warnings || []).map((warning) => `Warning: ${text(warning)}`), '',
    '## By model', '',
    '| Model | Usage entries | Input | Cached | Cache write | Output | AI credits | USD |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...report.modelCredits.map((item) => `| ${text(item.model)}${item.partial ? ' *' : ''} | ${item.callCount} | ${tokens(item.tokens.input)} | ${tokens(item.tokens.cached)} | ${tokens(item.tokens.cacheWrite)} | ${tokens(item.tokens.output)} | ${amount(item.credits)} | ${amount(item.usd)} |`),
    '', '## By turn', '',
    '| Turn | Prompt | Models | Input | Output | AI credits | USD | Running credits |',
    '| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: |',
    ...report.turns.map((turn) => `| ${turn.index}${turn.partial ? ' *' : ''} | ${text(turn.title)} | ${turn.models.map(text).join(', ') || 'Not recorded'} | ${tokens(turn.tokens.input)} | ${tokens(turn.tokens.output)} | ${amount(turn.credits)} | ${amount(turn.usd)} | ${amount(turn.cumulativeCredits)}${turn.cumulativePartial ? ' *' : ''} |`),
    '', '* marks incomplete estimates. Running totals are attributed subtotals, not claims of complete billed consumption.',
    '', '## Intermediate usage', ''
  ];
  for (const turn of report.turns) {
    lines.push(`### Turn ${turn.index}`, '',
      '| Model / activity | Input | Cached | Cache write | Output | Reasoning | AI credits |',
      '| --- | ---: | ---: | ---: | ---: | ---: | ---: |');
    for (const call of turn.calls) {
      lines.push(`| ${text(call.model)} / ${text(call.label)}${call.agent ? ` / Agent ${text(call.agent)}` : ''} | ${tokens(call.tokens.input)} | ${tokens(call.tokens.cached)} | ${tokens(call.tokens.cacheWrite)} | ${tokens(call.tokens.output)} | ${tokens(call.tokens.reasoning)} | ${amount(call.credits)} |`);
      if (call.notes.length) lines.push('', call.notes.map(text).join(' '), '');
    }
    if (!turn.calls.length) lines.push('No per-turn usage was persisted.');
    lines.push('');
  }
  if (report.unallocated.length) {
    lines.push('## Usage without a turn association', '',
      ...report.unallocated.map((call) => `- ${text(call.model)}: ${amount(call.credits)} AI credits / $${amount(call.usd)} USD; input ${tokens(call.tokens.input)}, output ${tokens(call.tokens.output)}. ${call.notes.map(text).join(' ')}`), '');
  }
  if (report.aggregate) {
    lines.push('## Latest session aggregate (not added to turns)', '',
      `Snapshot estimate: ${amount(report.aggregate.credits)} AI credits / $${amount(report.aggregate.usd)} USD.`,
      'This cumulative snapshot can include unattributed activity. Per-call context sizes are unavailable; default-tier estimates may be incomplete.', '',
      ...report.aggregate.calls.map((call) => `- ${text(call.model)}: ${amount(call.credits)} AI credits; input ${tokens(call.tokens.input)}, output ${tokens(call.tokens.output)}. ${call.notes.map(text).join(' ')}`));
  }
  return lines.join('\n') + '\n';
}
