import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { diffLines } from '../src/diff.js';
import { startServer } from '../src/server.js';

test('package.json and runtime source files have zero external npm package dependencies', async () => {
  const pkg = JSON.parse(await readFile(path.resolve('package.json'), 'utf8'));
  assert.equal(pkg.dependencies, undefined, 'package.json must have no runtime dependencies');

  for (const dir of ['src', 'public', 'build']) {
    const entries = await readdir(path.resolve(dir), { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !/\.(m?js|cjs|html|css)$/i.test(entry.name)) continue;
      const content = await readFile(path.resolve(dir, entry.name), 'utf8');
      assert.doesNotMatch(content, /\/vendor\//, `${dir}/${entry.name} must not reference /vendor/`);
      if (/\.(m?js|cjs)$/i.test(entry.name)) {
        for (const match of content.matchAll(/(?:from\s+|require\s*\(\s*)['"]([^'"]+)['"]/g)) {
          const spec = match[1];
          assert.ok(
            spec.startsWith('node:') || spec.startsWith('./') || spec.startsWith('../'),
            `${dir}/${entry.name} imports external package "${spec}"`
          );
        }
      }
    }
  }
});

test('native Myers diffLines handles additions, deletions, replacements, CRLF, and large prefix/suffix files', () => {
  assert.deepEqual(diffLines('', ''), []);
  assert.deepEqual(diffLines('same\nline\n', 'same\nline\n'), [
    { value: 'same\nline\n', count: 2, added: false, removed: false }
  ]);

  const created = diffLines('', 'first\nsecond\n');
  assert.deepEqual(created, [{ value: 'first\nsecond\n', count: 2, added: true, removed: false }]);

  const edited = diffLines('alpha\nbeta\ngamma\n', 'alpha\nbeta-updated\nnew-line\ngamma\n');
  assert.deepEqual(edited, [
    { value: 'alpha\n', count: 1, added: false, removed: false },
    { value: 'beta\n', count: 1, added: false, removed: true },
    { value: 'beta-updated\nnew-line\n', count: 2, added: true, removed: false },
    { value: 'gamma\n', count: 1, added: false, removed: false }
  ]);

  const crlf = diffLines('a\r\nb\r\n', 'a\r\nc\r\n');
  assert.equal(crlf.filter((p) => p.removed)[0].value, 'b\r\n');
  assert.equal(crlf.filter((p) => p.added)[0].value, 'c\r\n');

  const prefix = Array.from({ length: 1500 }, (_, i) => `header-${i}\n`).join('');
  const suffix = Array.from({ length: 1500 }, (_, i) => `footer-${i}\n`).join('');
  const big = diffLines(`${prefix}old-mid\n${suffix}`, `${prefix}new-mid\n${suffix}`);
  assert.equal(big.length, 4);
  assert.equal(big[1].removed, true);
  assert.equal(big[2].added, true);
});

test('native icons.js and markdown.js cover every UI icon, GFM Markdown construct, highlighter, and XSS sanitizer', async () => {
  const sandbox = {};
  sandbox.globalThis = sandbox;
  vm.runInNewContext(await readFile(path.resolve('public/icons.js'), 'utf8'), sandbox);
  vm.runInNewContext(await readFile(path.resolve('public/markdown.js'), 'utf8'), sandbox);

  const { chronicleIcons, chronicleMarkdown } = sandbox;
  assert.ok(chronicleIcons && chronicleMarkdown);

  // Ensure every icon name referenced in HTML and JS exists in chronicleIcons.ICONS
  const referenced = new Set();
  for (const file of ['public/index.html', 'public/log.html', 'public/app.js', 'public/log.js']) {
    const text = await readFile(path.resolve(file), 'utf8');
    for (const m of text.matchAll(/data-lucide="([a-z0-9-]+)"/g)) referenced.add(m[1]);
    for (const m of text.matchAll(/icon\('([a-z0-9-]+)'/g)) referenced.add(m[1]);
  }
  for (const name of referenced) {
    assert.ok(chronicleIcons.ICONS[name], `Missing SVG definition for icon "${name}"`);
    assert.match(chronicleIcons.svg(name, 'extra'), /<svg\b[^>]*class="lucide/);
  }

  // GFM Markdown + syntax highlighting + placeholder safety + XSS sanitization
  const sampleMd = [
    '# Heading <session-name>-summary.md',
    '',
    'Keep `snake_case_name` and literal snake_case_ident untouched while rendering **bold**, *italic*, ~~strike~~, and [Docs](https://example.com).',
    '',
    '| Col A | Col B |',
    '| --- | --- |',
    '| 1 | `two` |',
    '',
    '- [x] Completed task',
    '- [ ] Pending task',
    '',
    '```javascript',
    'const answer = 42; // comment',
    '```',
    '',
    '[bad-md-link](javascript:alert(3))'
  ].join('\n');

  const rawHtml = chronicleMarkdown.parseMarkdown(sampleMd);
  const safeHtml = chronicleMarkdown.sanitizeHtml(rawHtml);

  assert.match(safeHtml, /<h1>Heading &lt;session-name&gt;-summary\.md<\/h1>/);
  assert.match(safeHtml, /snake_case_ident/);
  assert.doesNotMatch(safeHtml, /<em>case<\/em>/);
  assert.match(safeHtml, /<strong>bold<\/strong>/);
  assert.match(safeHtml, /<del>strike<\/del>/);
  assert.match(safeHtml, /<table><thead><tr><th>Col A<\/th><th>Col B<\/th><\/tr><\/thead>/);
  assert.match(safeHtml, /task-checked/);
  assert.match(safeHtml, /hljs-keyword/);
  assert.doesNotMatch(safeHtml, /javascript:/i);

  // Also verify direct raw HTML sanitization strips scripts, event handlers, inline styles, and unsafe URLs
  const sanitizedDirty = chronicleMarkdown.sanitizeHtml(
    '<p style="color:red">Hello</p><script>alert(1)</script><img src="x" onerror="alert(2)"><a href="javascript:alert(3)">click</a>'
  );
  assert.doesNotMatch(sanitizedDirty, /<script/i);
  assert.doesNotMatch(sanitizedDirty, /onerror/i);
  assert.doesNotMatch(sanitizedDirty, /style=/i);
  assert.doesNotMatch(sanitizedDirty, /javascript:/i);
});

test('native node:http server enforces security guards, serves static assets, and handles API routes', async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'chronicle-http-test-'));
  const sessionDir = path.join(dataDir, 'ws', 'chatSessions');
  await mkdir(sessionDir, { recursive: true });
  await writeFile(path.join(sessionDir, 'demo.json'), JSON.stringify({
    sessionId: 'demo',
    customTitle: 'Zero Dep Session',
    requests: [{ requestId: 'r1', timestamp: 1730000000000, modelId: 'copilot/gpt-4.1', message: { text: 'Ping' }, response: [{ value: 'Pong' }] }]
  }));

  const instance = await startServer({ port: 0, dataDir, loadSamples: false, paths: [path.join(dataDir, 'ws')] });
  t.after(async () => {
    instance.library.close();
    await new Promise((resolve) => instance.server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  });

  // Static assets load with CSP and no X-Powered-By
  const indexRes = await fetch(`${instance.url}/`);
  assert.equal(indexRes.status, 200);
  assert.equal(indexRes.headers.get('x-powered-by'), null);
  assert.match(indexRes.headers.get('content-security-policy') || '', /default-src 'self'/);
  assert.match(await indexRes.text(), /src="\/icons\.js"/);

  for (const asset of ['/icons.js', '/markdown.js', '/app.js', '/styles.css', '/log.html', '/log.js']) {
    const res = await fetch(`${instance.url}${asset}`);
    assert.equal(res.status, 200, `Expected 200 for ${asset}`);
  }

  // Cross-origin protection & payload limit
  const crossOrigin = await fetch(`${instance.url}/api/import`, {
    method: 'POST',
    headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: '.' })
  });
  assert.equal(crossOrigin.status, 403);

  const oversized = await fetch(`${instance.url}/api/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: 'x'.repeat(40_000) })
  });
  assert.equal(oversized.status, 413);

  // API sessions & export
  await instance.library.idle();
  const list = await (await fetch(`${instance.url}/api/sessions`)).json();
  assert.equal(list.sessions.length, 1);
  assert.equal(list.sessions[0].title, 'Zero Dep Session');

  const exportRes = await fetch(`${instance.url}/api/sessions/${list.sessions[0].id}/export`);
  assert.equal(exportRes.status, 200);
  assert.match(exportRes.headers.get('content-disposition') || '', /attachment;/);
});
