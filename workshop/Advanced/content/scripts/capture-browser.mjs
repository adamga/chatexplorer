import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

// Browser-side driver. Only reads UI, clicks real controls and acknowledges
// readiness; does not draw, restyle, replace data or synthesize any UI.
async function drive(name) {
  const $ = selector => document.querySelector(selector);
  const wait = async predicate => {
    for (let i = 0; i < 160; i++) {
      if (predicate()) return;
      await new Promise(r => setTimeout(r, 25));
    }
    throw Error(String(predicate));
  };
  try {
    if (name === 'log') {
      await wait(() => $('#log-title')?.textContent === 'Verify the route migration' &&
        $('#log-meta').innerText.includes('Completed') && document.querySelectorAll('.log-row').length >= 5 &&
        $('#log-entries').innerText.includes('Constructed structured session digest'));
    } else {
      await wait(() => document.querySelectorAll('.session-card').length === 3 &&
        !$('.session-cards').innerText.includes('INDEXING') && $('.session-cards').innerText.includes('Plan the versioned endpoint'));
      if (name !== 'starter') {
        Array.from(document.querySelectorAll('.session-card')).find(el => el.innerText.includes('Verify the route migration')).click();
        await wait(() => $('#create-summary-button')?.offsetWidth && $('#reader').innerText.includes('Verify the route migration'));
        if (name === 'config') {
          $('#config-button').click();
          await wait(() => $('#config-dialog').open && $('#cfg-agent-name').value === 'handoff-demo' &&
            $('#cfg-agent-endpoint').value.includes('foundry.invalid') && $('#cfg-tenant-id').value.endsWith('0001'));
        }
      }
    }
    await document.fonts.ready;
    await fetch('/capture-ready', { method: 'POST', body: 'OK' });
  } catch (e) { await fetch('/capture-ready', { method: 'POST', body: e.message }); }
}

export async function render({ chrome, temp, app, name, route = '/' }) {
  let status = '';
  // Forward to the actual loopback app. Add just a same-origin automation
  // script, since screenshot-only headless mode has no interactive driver.
  const proxy = http.createServer(async (req, res) => {
    try {
      if (process.env.CAPTURE_DEBUG) console.log(req.method, req.url);
      assert(req.url.startsWith('/') && !req.url.startsWith('//'));
      if (req.url === '/capture-ready') {
        for await (const chunk of req) status += chunk;
        res.end(); return;
      }
      if (req.url === '/capture-driver.js') {
        res.setHeader('Content-Type', 'text/javascript');
        res.end(`(${drive})(${JSON.stringify(name)});`); return;
      }
      const upstream = await fetch(app.url + req.url);
      const type = upstream.headers.get('content-type') || '';
      res.writeHead(upstream.status, { 'Content-Type': type, 'Cache-Control': 'no-store',
        'Content-Security-Policy': upstream.headers.get('content-security-policy') || "default-src 'self'" });
      if (type.includes('text/html'))
        res.end((await upstream.text()).replace('</body>', '<script src="/capture-driver.js"></script></body>'));
      else res.end(Buffer.from(await upstream.arrayBuffer()));
    } catch (e) { res.destroy(e); }
  });
  await new Promise((r, reject) => proxy.once('error', reject).listen(0, '127.0.0.1', r));
  try {
    const file = path.join(temp, name + '.png');
    const width = name === 'config' ? 1920 : 1600, height = width * 9 / 16;
    const child = spawn(chrome, ['--headless=new', '--disable-gpu', '--disable-extensions', '--no-first-run',
      '--disable-sync', '--disable-background-networking', '--disable-component-update', '--disable-default-apps',
      '--proxy-server=http://127.0.0.1:1', '--proxy-bypass-list=127.0.0.1;localhost',
      '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost', `--user-data-dir=${path.join(temp, 'browser-' + name)}`,
      '--no-pdf-header-footer', '--force-device-scale-factor=1', '--virtual-time-budget=6500',
      `--window-size=${width},${height}`, `--screenshot=${file}`, `http://127.0.0.1:${proxy.address().port}${route}`],
    { stdio: process.env.CAPTURE_DEBUG ? 'inherit' : 'ignore', timeout: 45000 });
    const code = await new Promise((r, reject) => { child.once('error', reject); child.once('exit', r); });
    assert.equal(code, 0, 'Browser failed for ' + name);
    assert.equal(status, 'OK', `Unverified ${name} state: ${status}`);
    const png = await fs.readFile(file);
    assert(png.length > 30000 && png.readUInt32BE(16) === width && png.readUInt32BE(20) === height);
    console.log(`${name}.png: populated UI verified, ${width}x${height}`);
    return png;
  } finally {
    proxy.closeAllConnections();
    await new Promise(r => proxy.close(r));
  }
}
