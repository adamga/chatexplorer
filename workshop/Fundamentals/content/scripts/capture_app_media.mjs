import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.resolve(__dirname, '..');
const SCREENSHOTS_DIR = path.join(CONTENT_DIR, 'assets', 'screenshots');
const CLIPS_DIR = path.join(CONTENT_DIR, 'assets', 'clips');
const REPO_ROOT = path.resolve(CONTENT_DIR, '..', '..', '..');

const require = createRequire(path.join(REPO_ROOT, 'appsample', 'package.json'));
const { chromium } = require('@playwright/test');

const APP_ROOT = process.env.CHRONICLE_LAB_APP || (fs.existsSync('C:\\testrun\\src\\server.js') ? 'C:\\testrun' : path.join(REPO_ROOT, 'workshop', 'Advanced', 'sampleapp'));
const TARGET_PORT = 3210;
const BASE_URL = `http://127.0.0.1:${TARGET_PORT}`;

async function buildDemoFixtures(rootDir) {
  // 1. VS Code workspaceStorage session #1 — Rocket Launch Countdown Game
  const wsRocket = path.join(rootDir, 'workspaceStorage', 'ws-rocket');
  await fsp.mkdir(path.join(wsRocket, 'chatSessions'), { recursive: true });
  await fsp.writeFile(path.join(wsRocket, 'workspace.json'), JSON.stringify({
    folder: 'file:///c%3A/workshop/rocket-countdown',
  }));
  const rocketSession = {
    version: 3,
    sessionId: 'sess-rocket-01',
    creationDate: Date.parse('2026-11-18T09:00:00Z'),
    lastMessageDate: Date.parse('2026-11-18T09:18:00Z'),
    customTitle: 'Build Rocket Countdown Timer (Zero Packages)',
    requests: [
      {
        requestId: 'req-r1',
        timestamp: Date.parse('2026-11-18T09:02:00Z'),
        modelId: 'copilot/claude-sonnet-5.5',
        message: { text: 'Create a playful rocket countdown timer in pure JavaScript with confetti stars and sound effects using Web Audio API—no npm packages!' },
        response: [
          { kind: 'thinking', value: 'Checking `.github/copilot-instructions.md` first: zero external npm packages allowed. I will build the timer with `requestAnimationFrame` and synthesize a cheerful launch chime using the browser Web Audio API.' },
          { kind: 'toolInvocationSerialized', toolId: 'create_file', invocationMessage: 'Creating countdown.js', pastTenseMessage: 'Created countdown.js (84 lines)' },
          { kind: 'toolInvocationSerialized', toolId: 'run_in_terminal', invocationMessage: 'node --test', pastTenseMessage: 'Ran node --test (6/6 passing)' },
          { value: 'Your zero-package **Rocket Countdown Timer** is ready!\n\n```javascript\nexport function startCountdown(seconds, onTick) {\n  let remaining = seconds;\n  onTick(remaining);\n  const timer = setInterval(() => {\n    remaining -= 1;\n    onTick(remaining);\n    if (remaining <= 0) clearInterval(timer);\n  }, 1000);\n  return () => clearInterval(timer);\n}\n```\n\n### What We Built\n- **Pure Browser JS:** Zero `node_modules` needed\n- **Web Audio Chime:** Synthesizes notes right in the browser\n- **Unit Tested:** All `6/6` `node:test` checks pass!' },
        ],
      },
      {
        requestId: 'req-r2',
        timestamp: Date.parse('2026-11-18T09:12:00Z'),
        modelId: 'copilot/claude-sonnet-5.5',
        message: { text: 'Add a pause and resume button so kids can freeze the rocket at T-minus 3 seconds!' },
        response: [
          { kind: 'thinking', value: 'Adding `pause()` and `resume()` state transitions cleanly while preserving existing tests.' },
          { value: 'Added **Freeze Rocket** and **Resume Launch** controls with keyboard `Spacebar` support!' },
        ],
      },
    ],
  };
  await fsp.writeFile(
    path.join(wsRocket, 'chatSessions', 'sess-rocket-01.jsonl'),
    JSON.stringify({ kind: 0, v: rocketSession }) + '\n'
  );

  // 2. VS Code workspaceStorage session #2 — Pixel Art Sticker Maker
  const wsPixel = path.join(rootDir, 'workspaceStorage', 'ws-pixel-stickers');
  await fsp.mkdir(path.join(wsPixel, 'chatSessions'), { recursive: true });
  await fsp.writeFile(path.join(wsPixel, 'workspace.json'), JSON.stringify({
    folder: 'file:///c%3A/workshop/pixel-sticker-studio',
  }));
  const pixelSession = {
    version: 3,
    sessionId: 'sess-pixel-02',
    creationDate: Date.parse('2026-11-17T14:00:00Z'),
    lastMessageDate: Date.parse('2026-11-17T14:25:00Z'),
    customTitle: 'Design 16x16 Pixel Art Sticker Canvas',
    requests: [
      {
        requestId: 'req-p1',
        timestamp: Date.parse('2026-11-17T14:05:00Z'),
        modelId: 'copilot/gpt-6.1-sol',
        message: { text: 'Build a 16x16 pixel art drawing grid with rainbow palette and PNG export using HTML5 Canvas.' },
        response: [
          { kind: 'thinking', value: 'Using standard `<canvas>` 2D context and `toDataURL("image/png")` so no image library is required.' },
          { value: 'Built the **16×16 Sticker Canvas** with mirror-draw mode, rainbow swatches, and instant PNG download!' },
        ],
      },
    ],
  };
  await fsp.writeFile(
    path.join(wsPixel, 'chatSessions', 'sess-pixel-02.jsonl'),
    JSON.stringify({ kind: 0, v: pixelSession }) + '\n'
  );

  // 3. Copilot Agent Host (.copilot/session-state) session — Chronicle Zero-Package Build!
  const agentRoot = path.join(rootDir, 'agent-sessions');
  const agentChronicle = path.join(agentRoot, 'agent-chronicle-lab');
  await fsp.mkdir(agentChronicle, { recursive: true });
  await fsp.writeFile(
    path.join(agentChronicle, 'workspace.yaml'),
    [
      'id: agent-chronicle-lab',
      'cwd: C:\\workshop\\Fundamentals\\sampleapp',
      'summary: Chronicle Chat Explorer — Zero-Package Workshop Build',
      'created_at: 2026-11-18T10:00:00Z',
      'updated_at: 2026-11-18T10:42:00Z',
    ].join('\n') + '\n'
  );
  const agentEvents = [
    {
      type: 'session.start',
      timestamp: '2026-11-18T10:00:00Z',
      data: { sessionId: 'agent-chronicle-lab', context: { cwd: 'C:\\workshop\\Fundamentals\\sampleapp' } },
    },
    {
      type: 'user.message',
      id: 'u-1',
      timestamp: '2026-11-18T10:01:00Z',
      data: { content: 'Create `.github/copilot-instructions.md` enforcing our Zero-Package Rule and build `src/server.js` bound strictly to `127.0.0.1:3210` with Dark & Light mode support!' },
    },
    {
      type: 'assistant.message',
      id: 'a-1',
      timestamp: '2026-11-18T10:01:12Z',
      data: {
        content: 'I will lock in our **Zero-Package Rule** in `.github/copilot-instructions.md` and harden `src/server.js` so it listens strictly on `127.0.0.1:3210` with full Content-Security-Policy protection.',
        reasoningText: 'First, verify `.github/copilot-instructions.md` forbids `npm install` and external CDNs. Next, update `src/server.js` default port and security headers, then run `node --test` to confirm 100% pass rate.',
        toolRequests: [
          {
            toolCallId: 'tc-edit-1',
            name: 'edit',
            arguments: {
              path: 'C:\\workshop\\Fundamentals\\sampleapp\\src\\server.js',
              old_str: "const HOST = '0.0.0.0';\nconst DEFAULT_PORT = 8080;\nconst ALLOW_EXTERNAL_ORIGIN = true;\n",
              new_str: "const HOST = '127.0.0.1';\nconst DEFAULT_PORT = 3210;\nconst ALLOW_EXTERNAL_ORIGIN = false;\n// Strict local-only security header guard\n",
            },
          },
          {
            toolCallId: 'tc-test-2',
            name: 'powershell',
            arguments: { command: 'node --check src/server.js && node --test' },
          },
        ],
      },
    },
    {
      type: 'tool.execution_start',
      timestamp: '2026-11-18T10:01:14Z',
      data: {
        toolCallId: 'tc-edit-1',
        toolName: 'edit',
        arguments: {
          path: 'C:\\workshop\\Fundamentals\\sampleapp\\src\\server.js',
          old_str: "const HOST = '0.0.0.0';\nconst DEFAULT_PORT = 8080;\nconst ALLOW_EXTERNAL_ORIGIN = true;\n",
          new_str: "const HOST = '127.0.0.1';\nconst DEFAULT_PORT = 3210;\nconst ALLOW_EXTERNAL_ORIGIN = false;\n// Strict local-only security header guard\n",
        },
      },
    },
    {
      type: 'tool.execution_complete',
      timestamp: '2026-11-18T10:01:15Z',
      data: { toolCallId: 'tc-edit-1', success: true, result: { content: 'Updated src/server.js successfully.' } },
    },
    {
      type: 'tool.execution_start',
      timestamp: '2026-11-18T10:01:16Z',
      data: { toolCallId: 'tc-test-2', toolName: 'powershell', arguments: { command: 'node --check src/server.js && node --test' } },
    },
    {
      type: 'tool.execution_complete',
      timestamp: '2026-11-18T10:01:19Z',
      data: { toolCallId: 'tc-test-2', success: true, result: { content: 'pass 21, fail 0 — zero external dependencies!' } },
    },
    {
      type: 'assistant.message',
      id: 'a-2',
      timestamp: '2026-11-18T10:01:24Z',
      data: {
        content: 'All **21/21 automated tests** pass with zero packages!\n\n```javascript\nconst server = http.createServer(handleRequest);\nserver.listen(3210, "127.0.0.1", () => {\n  console.log("Chat Explorer: http://127.0.0.1:3210");\n});\n```\n\nOpen `http://127.0.0.1:3210/` to explore your VS Code and Agent sessions!',
      },
    },
  ];
  await fsp.writeFile(
    path.join(agentChronicle, 'events.jsonl'),
    agentEvents.map(e => JSON.stringify(e)).join('\n') + '\n'
  );

  // 4. Copilot Agent Host session #2 — Mystery Bug Detective
  const agentDetective = path.join(agentRoot, 'agent-bug-detective');
  await fsp.mkdir(agentDetective, { recursive: true });
  await fsp.writeFile(
    path.join(agentDetective, 'workspace.yaml'),
    [
      'id: agent-bug-detective',
      'cwd: C:\\workshop\\treasure-map-quest',
      'summary: Fix Treasure Map Compass Sorting Bug',
      'created_at: 2026-11-18T08:15:00Z',
      'updated_at: 2026-11-18T08:35:00Z',
    ].join('\n') + '\n'
  );
  await fsp.writeFile(
    path.join(agentDetective, 'events.jsonl'),
    [
      { type: 'session.start', timestamp: '2026-11-18T08:15:00Z', data: { sessionId: 'agent-bug-detective', context: { cwd: 'C:\\workshop\\treasure-map-quest' } } },
      { type: 'user.message', id: 'u-b1', timestamp: '2026-11-18T08:16:00Z', data: { content: 'Why does sorting treasure chests A to Z put lowercase names at the bottom?' } },
      { type: 'assistant.message', id: 'a-b1', timestamp: '2026-11-18T08:16:08Z', data: { content: 'Using `localeCompare(undefined, { sensitivity: "base" })` fixes case-insensitive A → Z sorting cleanly!', reasoningText: 'ASCII `<` compares uppercase before lowercase; `localeCompare` solves this natively.' } },
    ].map(e => JSON.stringify(e)).join('\n') + '\n'
  );

  return {
    vscodeStorageDir: path.join(rootDir, 'workspaceStorage'),
    agentSessionsDir: agentRoot,
  };
}

async function waitForServer(url, timeoutMs = 15_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/sessions`);
      if (res.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function injectDemoCursor(page) {
  await page.evaluate(() => {
    if (document.getElementById('demo-cursor')) return;
    const style = document.createElement('style');
    style.textContent = `
      #demo-cursor {
        position: fixed;
        left: 960px;
        top: 540px;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(56,189,248,0.95) 0%, rgba(99,102,241,0.75) 60%, rgba(99,102,241,0) 100%);
        border: 2.5px solid #ffffff;
        box-shadow: 0 0 24px rgba(56,189,248,0.9), 0 4px 12px rgba(0,0,0,0.45);
        pointer-events: none;
        z-index: 2147483647;
        transform: translate(-50%, -50%);
        transition: left 0.55s cubic-bezier(0.22, 1, 0.36, 1), top 0.55s cubic-bezier(0.22, 1, 0.36, 1), transform 0.18s ease;
      }
      .demo-ripple {
        position: fixed;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 3px solid #38bdf8;
        pointer-events: none;
        z-index: 2147483646;
        transform: translate(-50%, -50%) scale(0.5);
        opacity: 1;
        animation: demoRippleAnim 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes demoRippleAnim {
        to { transform: translate(-50%, -50%) scale(3.4); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    const cursor = document.createElement('div');
    cursor.id = 'demo-cursor';
    document.body.appendChild(cursor);
  });
}

async function moveAndClick(page, selector, pauseAfterMs = 900) {
  const loc = typeof selector === 'string' ? page.locator(selector).first() : selector;
  const box = await loc.boundingBox();
  if (box) {
    const cx = Math.round(box.x + box.width / 2);
    const cy = Math.round(box.y + box.height / 2);
    await page.evaluate(({ x, y }) => {
      const c = document.getElementById('demo-cursor');
      if (c) {
        c.style.left = `${x}px`;
        c.style.top = `${y}px`;
      }
    }, { x: cx, y: cy });
    await page.waitForTimeout(580);
    await page.evaluate(({ x, y }) => {
      const c = document.getElementById('demo-cursor');
      if (c) c.style.transform = 'translate(-50%, -50%) scale(0.78)';
      const r = document.createElement('div');
      r.className = 'demo-ripple';
      r.style.left = `${x}px`;
      r.style.top = `${y}px`;
      document.body.appendChild(r);
      setTimeout(() => r.remove(), 700);
      setTimeout(() => { if (c) c.style.transform = 'translate(-50%, -50%) scale(1)'; }, 180);
    }, { x: cx, y: cy });
  }
  await loc.click();
  await page.waitForTimeout(pauseAfterMs);
}

async function main() {
  console.log(`Starting completed Fundamentals lab server from ${APP_ROOT} on ${BASE_URL}...`);
  const tmpRoot = path.join(CONTENT_DIR, '.cache', 'demo-sessions');
  await fsp.rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
  await fsp.mkdir(tmpRoot, { recursive: true });
  const dataDir = path.join(tmpRoot, 'data');
  await fsp.mkdir(dataDir, { recursive: true });
  const fixtures = await buildDemoFixtures(tmpRoot);

  const serverProc = spawn(process.execPath, [path.join(APP_ROOT, 'src', 'server.js')], {
    cwd: APP_ROOT,
    env: {
      ...process.env,
      PORT: String(TARGET_PORT),
      CHRONICLE_DATA_DIR: dataDir,
      USERPROFILE: 'C:\\Users\\WorkshopStudent',
      HOME: 'C:\\Users\\WorkshopStudent',
      APPDATA: 'C:\\Users\\WorkshopStudent\\AppData\\Roaming',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProc.stdout.on('data', d => process.stdout.write(`[server] ${d}`));
  serverProc.stderr.on('data', d => process.stderr.write(`[server-err] ${d}`));

  try {
    await waitForServer(BASE_URL);

    // Pre-import both fixture directories via the HTTP API
    for (const importDir of [fixtures.vscodeStorageDir, fixtures.agentSessionsDir]) {
      const res = await fetch(`${BASE_URL}/api/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: importDir }),
      });
      if (!res.ok) throw new Error(`Import failed for ${importDir}: ${res.status}`);
    }

    // Wait for background worker indexing to settle
    for (let i = 0; i < 40; i++) {
      const st = await (await fetch(`${BASE_URL}/api/sessions`)).json();
      if (!st.indexing?.active && (st.sessions?.length ?? 0) >= 4) break;
      await new Promise(r => setTimeout(r, 250));
    }

    const browser = await chromium.launch({ headless: true });
    try {
      // Pass 1: Clean crisp 1920x1080 PNG screenshots (without demo cursor overlay)
      const shotContext = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
      });
      const shotPage = await shotContext.newPage();
      await shotPage.goto(BASE_URL, { waitUntil: 'networkidle' });
      await shotPage.waitForTimeout(700);

      // Screenshot 04: Sortable Session Library (Dark Mode)
      await shotPage.locator('#library-button').click();
      await shotPage.waitForTimeout(500);
      await shotPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-library-sortable-dark.png') });

      // Screenshot 02: Open VS Code session dialog (pre-filled default path!)
      await shotPage.locator('#open-button').click();
      await shotPage.waitForTimeout(450);
      await shotPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-open-vscode-dialog.png') });
      await shotPage.keyboard.press('Escape');
      await shotPage.waitForTimeout(300);

      // Screenshot 03: Open Agent sessions dialog (pre-filled .copilot\session-state!)
      await shotPage.locator('#open-agent-button').click();
      await shotPage.waitForTimeout(450);
      await shotPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-open-agent-dialog.png') });
      await shotPage.keyboard.press('Escape');
      await shotPage.waitForTimeout(300);

      // Screenshot 05: High-contrast Light ("White") Mode Library sorted Name A -> Z
      await shotPage.locator('#sidebar-sort').selectOption('name-asc');
      await shotPage.waitForTimeout(300);
      await shotPage.locator('#theme-button').click();
      await shotPage.waitForTimeout(450);
      await shotPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-library-light-mode.png') });

      // Switch back to Dark Mode + Newest first for deep session inspection shots
      await shotPage.locator('#theme-button').click();
      await shotPage.locator('#sidebar-sort').selectOption('newest');
      await shotPage.waitForTimeout(450);

      // Screenshot 01: Hero Session Overview (Chronicle Zero-Package Workshop Build)
      await shotPage.getByText('Chronicle Chat Explorer — Zero-Package Workshop Build').first().click();
      await shotPage.waitForTimeout(700);
      await shotPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-hero-overview-dark.png') });

      // Screenshot 06: Read Full Session (Conversation Story with Reasoning, Tools & Highlighted Code)
      await shotPage.locator('#story-button').click();
      await shotPage.waitForTimeout(800);
      await shotPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-full-story-view.png') });

      // Screenshot 07: Before vs. After File Diff View (filter Activity explorer to Edits and click leaf file edit!)
      await shotPage.locator('#activity-filter').selectOption('edits');
      await shotPage.waitForTimeout(350);
      await shotPage.locator('#explorer-tree [role="treeitem"]').last().click();
      await shotPage.waitForTimeout(700);
      await shotPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-file-diff-view.png') });
      await shotPage.locator('#activity-filter').selectOption('all');
      await shotPage.waitForTimeout(250);

      // Screenshot 08: Global Search across all sessions
      await shotPage.locator('#global-search').fill('Zero-Package');
      await shotPage.locator('#global-search').press('Enter');
      await shotPage.waitForTimeout(750);
      await shotPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-global-search.png') });

      await shotContext.close();
      console.log('Captured all 8 1920x1080 PNG screenshots from live http://127.0.0.1:3210/!');

      // Pass 2: Record live 1920x1080 interactive video tour of http://127.0.0.1:3210/
      const rawVidDir = path.join(tmpRoot, 'raw-video');
      await fsp.mkdir(rawVidDir, { recursive: true });
      const vidContext = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        recordVideo: { dir: rawVidDir, size: { width: 1920, height: 1080 } },
      });
      const vidPage = await vidContext.newPage();
      await vidPage.goto(BASE_URL, { waitUntil: 'networkidle' });
      await injectDemoCursor(vidPage);
      await vidPage.waitForTimeout(900);

      // Choreographed 24-second live app tour!
      await moveAndClick(vidPage, '#open-button', 1400);
      await vidPage.keyboard.press('Escape');
      await vidPage.waitForTimeout(450);

      await moveAndClick(vidPage, '#open-agent-button', 1400);
      await vidPage.keyboard.press('Escape');
      await vidPage.waitForTimeout(450);

      await moveAndClick(vidPage, '#sidebar-sort', 400);
      await vidPage.locator('#sidebar-sort').selectOption('name-asc');
      await vidPage.waitForTimeout(1100);
      await vidPage.locator('#sidebar-sort').selectOption('newest');
      await vidPage.waitForTimeout(700);

      await moveAndClick(vidPage, '#theme-button', 1500);
      await moveAndClick(vidPage, '#theme-button', 900);

      await moveAndClick(vidPage, vidPage.getByText('Chronicle Chat Explorer — Zero-Package Workshop Build').first(), 1600);
      await moveAndClick(vidPage, '#story-button', 1800);

      // Filter to Edits & click leaf edit node for live diff reveal
      await vidPage.locator('#activity-filter').selectOption('edits');
      await vidPage.waitForTimeout(400);
      const editLoc = vidPage.locator('#explorer-tree [role="treeitem"]').last();
      if (await editLoc.count() > 0) {
        await moveAndClick(vidPage, editLoc, 2200);
      }
      await vidPage.locator('#activity-filter').selectOption('all');

      // Live search
      await moveAndClick(vidPage, '#global-search', 300);
      await vidPage.locator('#global-search').type('Zero-Package', { delay: 65 });
      await vidPage.keyboard.press('Enter');
      await vidPage.waitForTimeout(1800);

      const recordedVideo = vidPage.video();
      await vidContext.close();
      const recordedWebmPath = await recordedVideo.path();
      const destWebm = path.join(CLIPS_DIR, 'live-app-tour.webm');
      await fsp.copyFile(recordedWebmPath, destWebm);
      console.log(`Saved live recorded browser tour to ${destWebm}`);
    } finally {
      await browser.close();
    }
  } finally {
    serverProc.kill();
    await new Promise(r => setTimeout(r, 600));
    await fsp.rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch(err => {
  console.error('CAPTURE ERROR:', err);
  process.exit(1);
});
