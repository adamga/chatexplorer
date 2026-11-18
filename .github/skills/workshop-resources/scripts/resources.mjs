import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export function loadRegistry(root) {
  const file = join(resolve(root), 'resourceinfo.txt');
  if (!existsSync(file)) throw new Error('Missing resourceinfo.txt: copy resourceinfo.example.txt and configure local resources.');
  let data;
  try { data = JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
  catch { throw new Error('resourceinfo.txt must contain valid JSON; contents were not logged.'); }
  if (data.version !== 1 || !Array.isArray(data.services) || !Array.isArray(data.agents)) throw new Error('Unsupported resource registry schema.');
  const ids = data.services.map(s => s.id);
  if (ids.some(id => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) throw new Error('Service IDs must be non-empty and unique.');
  return data;
}

export function summary(data, env = process.env) {
  return {
    version: data.version,
    workshop: Object.fromEntries(['sampleApp', 'starter', 'durationMinutes', 'presentationMinutes', 'delivery', 'templateDeck', 'outputDirectory', 'audiences', 'externalContentApproved'].filter(k => k in (data.workshop ?? {})).map(k => [k, data.workshop[k]])),
    agents: data.agents.map(a => ({ name: a.name, transport: a.transport, purpose: a.purpose, serviceId: a.serviceId })),
    services: data.services.map(s => ({
      id: s.id, purpose: s.purpose, enabled: s.enabled === true,
      authentication: s.credential ? ((s.credential.env && env[s.credential.env]) || s.credential.value ? 'configured' : 'missing') : 'none',
    })),
  };
}

export async function invoke(data, id, payload, { allowExternal = false, env = process.env, fetcher = fetch } = {}) {
  const service = data.services.find(s => s.id === id);
  if (!service || service.enabled !== true) throw new Error('Service is missing or disabled.');
  let url;
  try { url = new URL(service.endpoint); } catch { throw new Error('Invalid service endpoint.'); }
  if (url.username || url.password || url.search || url.hash) throw new Error('Endpoint credentials/query strings are not supported; use the credential field.');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (!['https:', 'http:'].includes(url.protocol) || (url.protocol === 'http:' && !local)) throw new Error('Use HTTPS for remote services.');
  if (!local && !(allowExternal && data.workshop?.externalContentApproved === true)) throw new Error('External transmission requires approval in the registry and --allow-external.');
  const headers = { 'content-type': 'application/json' };
  const credential = service.credential;
  if (credential) {
    const token = credential.env ? env[credential.env] : credential.value;
    if (!token || typeof token !== 'string') throw new Error('Required service credential is unavailable.');
    headers[credential.header ?? 'Authorization'] = `${credential.prefix ?? 'Bearer '}${token}`;
  }
  const method = service.method ?? 'POST';
  if (!['POST', 'GET'].includes(method)) throw new Error('Only GET and POST service operations are supported.');
  if (method === 'GET' && payload != null) throw new Error('GET services do not accept a request payload.');
  const seconds = service.timeoutSeconds ?? 60;
  if (!Number.isFinite(seconds) || seconds < 1 || seconds > 600) throw new Error('Timeout must be between 1 and 600 seconds.');
  let response;
  try {
    response = await fetcher(url, { method, headers, body: method === 'POST' ? JSON.stringify(payload ?? {}) : undefined, redirect: 'error', signal: AbortSignal.timeout(seconds * 1000) });
  } catch { throw new Error('Service request failed; endpoint, credentials and request body were not logged.'); }
  // Never dump a provider response: even successful services can echo a credential or sensitive prompt.
  return { serviceId: id, status: response.status, ok: response.ok, contentType: response.headers.get('content-type') };
}

export async function main(args) {
  const [command, ...rest] = args;
  const option = key => { const at = rest.indexOf(key); return at >= 0 ? rest[at + 1] : undefined; };
  const root = resolve(option('--root') ?? process.cwd());
  if (command === 'init') {
    const target = join(root, 'resourceinfo.txt');
    if (existsSync(target)) throw new Error('resourceinfo.txt already exists; refusing to overwrite it.');
    writeFileSync(target, readFileSync(join(root, 'resourceinfo.example.txt')), { flag: 'wx', mode: 0o600 });
    return { initialized: true, servicesInvoked: false };
  }
  const registry = loadRegistry(root);
  if (command === 'inspect') return summary(registry);
  if (command === 'invoke') {
    const request = option('--request');
    let payload;
    try { payload = request ? JSON.parse(readFileSync(resolve(root, request), 'utf8')) : undefined; }
    catch { throw new Error('Request file must contain valid JSON; contents were not logged.'); }
    return invoke(registry, rest[0], payload, { allowExternal: rest.includes('--allow-external') });
  }
  throw new Error('Usage: resources.mjs init|inspect|invoke <service-id> [--root <repo>] [--request <file>] [--allow-external]');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(await main(process.argv.slice(2)), null, 2)); }
  catch (err) { console.error(err.message); process.exitCode = 1; }
}
