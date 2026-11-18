# Lab 03 — Building a Zero-Package Local Web Server

⏱️ **Estimated Time:** 10 minutes

---

## How Do We Serve a Web App Without Express?

Most Node.js tutorials tell you to install `express` just to build a web server. Surprise: Node.js has had a fast, built-in web server module called **`node:http`** since day one!

In this lab, we'll prompt Copilot to create `src/server.js` using pure `node:http` and `node:fs`:
- It listens **only** on your own computer (`127.0.0.1` on port `3210`), blocking cross-site requests so random websites on the internet can never read your local chats.
- It computes your computer's **default session folder paths** (`workspaceStorage` for VS Code, and `.copilot\session-state` for Copilot Agent sessions) so our UI can pre-fill them automatically!
- It remembers folders you import in `.chat-explorer.json` so they reload next time you start the app.
- It serves static files from `public/` safely (blocking `..` path-traversal tricks).

---

## Step 1 — Prompt Copilot to Build `src/server.js`

Copy the prompt below, paste it into **Copilot Chat (Agent mode)**, and press **Enter**:

```text
Create `src/server.js` using ONLY built-in Node.js modules (`node:http`, `node:fs`, `node:fs/promises`, `node:path`, `node:os`, `node:url`)—no Express or external packages.

Requirements for `src/server.js`:
1. Security & Headers on every request:
   - Reject requests whose `Host` header is not `127.0.0.1` or `localhost` (with optional port) with `403` JSON `{ error: "Local requests only." }`.
   - Reject cross-origin requests (`Origin` header not matching `http://${host}`, or `Sec-Fetch-Site: cross-site`) with `403` JSON `{ error: "Cross-origin access is not allowed." }`.
   - Set `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, and `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'`.

2. Helper `defaultDevicePaths()` returning `{ vscodeStorage, agentSessions }` for the current OS:
   - Windows: `%APPDATA%\Code\User\workspaceStorage`
   - macOS: `~/Library/Application Support/Code/User/workspaceStorage`
   - Linux: `~/.config/Code/User/workspaceStorage`
   - `agentSessions` (all OSes): `~/.copilot/session-state`

3. JSON API Routes (with a 32 KB request body limit returning 413 if exceeded):
   - `GET /api/sessions` -> returns `{ ...library.list(), warnings: startupWarnings, defaultPaths: defaultDevicePaths() }`
   - `POST /api/import` -> reads `{ path }`, imports via `library.addPath`, persists imported paths atomically to `.chat-explorer.json` (or `path.join(dataDir, 'settings.json')` when `dataDir` is passed), and returns `{ found, sessions, indexing }`
   - `GET /api/search?q=...&session=...` -> returns `library.search(...)`
   - `GET /api/sessions/:id` -> returns `{ ...summarizeSession(session), overview: summarizeNode(session.overview), requests: session.requests.map(summarizeNode) }`
   - `GET /api/sessions/:id/nodes/:nodeId` -> returns `await detailNodeAsync(session, item)` (or `404` if missing)
   - `GET /api/sessions/:id/story?parent=...&offset=...&limit=...` -> returns `storyPage(...)`
   - `GET /api/sessions/:id/search?q=...` -> returns `{ ids }` of matching node IDs in that session
   - `GET /api/sessions/:id/export` -> downloads `session.raw` as `Content-Disposition: attachment; filename="chat-<id>.json"`

4. Static File Serving:
   - Serve `GET` and `HEAD` requests from `publicDir` (defaulting to `public/`, mapping `/` -> `/index.html`) with proper MIME types (`.html`, `.css`, `.js`, `.json`, `.svg`, `.png`) and strict path-traversal protection so paths cannot escape `publicDir`.

5. Export `startServer({ port = 3210, dataDir, publicDir, paths = [] } = {})` binding strictly to `'127.0.0.1'` (returning `{ server, port, url, close, library, importPath }` where `close()` closes `library`, calls `server.closeAllConnections?.()`, and awaits `server.close()`), and auto-start when `src/server.js` is executed directly from the CLI (supporting optional `--path <folder>`, `process.env.PORT`, and `process.env.CHRONICLE_DATA_DIR`), logging `Chat Explorer: http://127.0.0.1:<port>`.

6. Add an HTTP server test in `test/parser.test.js` using isolated `os.tmpdir()` `dataDir` and `publicDir` folders (never write temporary test fixtures into the workspace `public/` directory, avoiding Windows file-watcher `EBUSY` locks!) verifying `/api/sessions` (including `defaultPaths`), `/api/import`, static serving, cross-origin `403` blocking, and export download. Run `node --check src/server.js` and `node --test`; leave `package.json` unchanged.
```

---

## Step 2 — Verify Your Server Tests Pass

In your VS Code Terminal, run:

```powershell
node --check src/server.js
node --test
```

Confirm both commands succeed with **0 errors**!

---

## ✅ Lab 03 Checkpoint

- [x] `src/server.js` runs on Node's built-in `node:http` with zero npm packages.
- [x] Security checks (`127.0.0.1` binding, cross-origin `403` protection, CSP headers) and all `/api/*` routes pass automated tests.

👉 **Next up: [Lab 04 — Building the Interactive Browser Explorer UI](./Lab-04-Interactive-Explorer-UI.md)**
