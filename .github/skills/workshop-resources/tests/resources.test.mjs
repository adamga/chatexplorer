import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadRegistry, summary, invoke, main } from '../scripts/resources.mjs';

const registry = (endpoint = 'http://localhost:8088/render') => ({ version: 1, agents: [], workshop: { externalContentApproved: false }, services: [{ id: 'renderer', enabled: true, endpoint, credential: { env: 'TEST_TOKEN' } }] });
const env = { TEST_TOKEN: 'synthetic-test-secret' };

test('inspection never prints credentials, endpoints, or unknown workshop fields', () => {
  const data = registry();
  data.workshop.secret = 'synthetic-test-secret';
  data.services[0].credential.value = 'synthetic-test-secret';
  const text = JSON.stringify(summary(data, env));
  assert.ok(!text.includes(env.TEST_TOKEN));
  assert.ok(!text.includes('localhost'));
  assert.equal(summary(data, env).services[0].authentication, 'configured');
});

test('invocation injects the environment secret only into the header and omits response bodies', async () => {
  let request;
  const result = await invoke(registry(), 'renderer', { topic: 'example' }, { env, fetcher: async (url, options) => {
    request = options;
    return new Response(env.TEST_TOKEN, { status: 200, headers: { 'content-type': 'text/plain' } });
  } });
  assert.equal(request.headers.Authorization, `Bearer ${env.TEST_TOKEN}`);
  assert.equal(request.redirect, 'error');
  assert.equal(result.ok, true);
  assert.ok(!JSON.stringify(result).includes(env.TEST_TOKEN));
});

test('remote calls require both approval gates and reject insecure URLs', async () => {
  await assert.rejects(invoke(registry('https://example.com/render'), 'renderer', {}, { env }), /approval/);
  await assert.rejects(invoke(registry('http://example.com/render'), 'renderer', {}, { env, allowExternal: true }), /HTTPS/);
  await assert.rejects(invoke(registry('https://user:password@example.com/render'), 'renderer', {}, { env }), /credentials/);
  await assert.rejects(invoke(registry('https://example.com/render?token=x'), 'renderer', {}, { env }), /credentials/);
});

test('approved remote invocation and inline credential are supported without disclosure', async () => {
  const data = registry('https://example.com/render');
  data.workshop.externalContentApproved = true;
  data.services[0].credential = { header: 'X-Api-Key', prefix: '', value: 'inline-test-secret' };
  const result = await invoke(data, 'renderer', {}, { allowExternal: true, fetcher: async (url, options) => {
    assert.equal(options.headers['X-Api-Key'], 'inline-test-secret');
    return new Response('', { status: 200 });
  } });
  assert.ok(!JSON.stringify(result).includes('inline-test-secret'));
});

test('missing authentication and provider errors are redacted', async () => {
  await assert.rejects(invoke(registry(), 'renderer', {}, { env: {} }), /unavailable/);
  await assert.rejects(invoke(registry(), 'renderer', {}, { env, fetcher: async () => { throw new Error(env.TEST_TOKEN); } }), err => !err.message.includes(env.TEST_TOKEN));
  const data = registry(); data.services[0].enabled = false;
  await assert.rejects(invoke(data, 'renderer', {}, { env }), /disabled/);
});

test('root registry initialization is non-destructive and malformed files do not leak', async () => {
  const root = mkdtempSync(join(tmpdir(), 'workshop-resource-test-'));
  try {
    writeFileSync(join(root, 'resourceinfo.example.txt'), JSON.stringify(registry()));
    assert.equal((await main(['init', '--root', root])).servicesInvoked, false);
    assert.equal(loadRegistry(root).version, 1);
    await assert.rejects(main(['init', '--root', root]), /overwrite/);
    writeFileSync(join(root, 'resourceinfo.txt'), 'synthetic-test-secret');
    assert.throws(() => loadRegistry(root), err => !err.message.includes('synthetic-test-secret'));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
