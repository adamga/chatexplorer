# Lab 02 — Reading Saved Chat History & File Diffs

⏱️ **Estimated Time:** 15 minutes

---

## How Does VS Code Save Your Chats?

Before we build a webpage, our Node.js backend needs to know how to **find** and **read** saved chat sessions on your computer!

VS Code and GitHub Copilot save sessions in two main places on your machine:
1. **Classic VS Code Chat (`workspaceStorage`):**
   Inside `%APPDATA%\Code\User\workspaceStorage\<workspace-hash>\chatSessions\*.jsonl` (or `.json`), plus optional sibling folders like `workspace.json` (which tells us the project name) and `chatEditingSessions\` (which stores before/after file edits).
   - Fun fact: VS Code `.jsonl` files are a *replay log*! Line 1 (`kind: 0`) is the starting snapshot, `kind: 1` sets a property, `kind: 2` appends to an array, and `kind: 3` deletes a property.
2. **Copilot Agent Host & CLI (`.copilot\session-state`):**
   Inside `%USERPROFILE%\.copilot\session-state\<session-uuid>\`, where `events.jsonl` stores an append-only stream of events (`session.start`, `user.message`, `assistant.message`, `tool.execution_start`, `tool.execution_complete`, `session.task_complete`) and `workspace.yaml` stores the session title and workspace folder!

In this lab, we'll prompt Copilot to build four clean backend files—with **zero npm packages**—plus automated tests to prove they work!

---

## Step 1 — Prompt Copilot to Build the Diff Engine, Parser & Library

Copy the prompt below, paste it into **Copilot Chat (Agent mode)**, and press **Enter**:

```text
Now let's build the zero-dependency session discovery, parser, diff engine, and search library in `src/`, plus unit tests in `test/`:

1. `src/diff.js`:
   - Export `diffLines(oldStr, newStr, options = {})` written in pure JavaScript (Myers shortest-edit-script line diff with common prefix/suffix trimming and optional `options.timeout` ms guard using `node:perf_hooks`).
   - Return an array of `{ value, count, added, removed }` chunks (keeping trailing `\n` on line tokens so multi-line hunks split cleanly).

2. `src/parser.js`:
   - `discover(inputPath)`: Recursively discover persisted sessions up to depth 4 without modifying any files:
     - VS Code `chatSessions` / `emptyWindowChatSessions` / `transferredChatSessions` `.jsonl` and `.json` files (preferring `.jsonl` when both exist, and resolving `state.vscdb` to its parent folder).
     - Copilot Agent / CLI session folders containing `events.jsonl` (and resolving `workspace.yaml` to its sibling `events.jsonl`), skipping `.session-operation-locks`, `node_modules`, `.git`, `checkpoints`, `files`, `research`, and `contents`.
   - `replay(entries, warnings)`: Safely replay VS Code mutation logs (`kind: 0` snapshot, `1` set, `2` array splice/append, `3` delete) while blocking prototype-pollution keys (`__proto__`, `prototype`, `constructor`).
   - `loadSession(file)`: Support BOTH formats and normalize them into a unified tree of nodes (`overview`, `prompt`, `response`, `reasoning`, `tool`, `edit`, `model`, `group`, `context`, `event`):
     - For VS Code `chatSessions`: join optional sibling `workspace.json`, `GitHub.copilot-chat/transcripts/<id>.jsonl` (tool arguments & completion), and `chatEditingSessions/<id>/state.json` + `contents/*` snapshots, tagged `sessionFormat: 'vscode-chat'`.
     - For Copilot Agent `events.jsonl`: parse sibling `workspace.yaml` (with a pure-JS `parseWorkspaceYaml` helper) and optional `vscode.metadata.json` / `plan.md`, group `user.message` turns with `assistant.message` (`content` + `reasoningText` / `reasoningOpaque`), pair `tool.execution_start` and `tool.execution_complete` (including commands, durations, outputs, `task_complete` summaries, and `edit`/`create` before/after diffs), tagged `sessionFormat: 'agent-host'`.
   - Export `summarizeSession`, `summarizeNode`, `detailNode` (computing `diffLines(item.before, item.after)` when `before` and `after` strings exist, and bounding huge raw JSON previews), `detailNodeAsync`, `storyPage(session, { parentId, offset, limit })`, `buildCorpus(session)`, and `sessionKey(file)`.

3. `src/indexer.js` & `src/library.js`:
   - `src/indexer.js`: Child-process worker (`process.on('message', ...)`) that calls `loadSession`, `summarizeSession`, and `buildCorpus` so indexing big sessions never blocks the server.
   - `src/library.js`: `createLibrary({ cacheDir })` that queues indexing smallest-first in a forked worker, caches summaries and search corpora to disk keyed by file size + mtime signatures, hides 0-prompt empty sessions (counting them in `empty`), keeps an LRU cache of loaded sessions, and provides `addPath`, `list`, `getSession`, `search(query, { session })`, `idle`, and `close`.

4. Update `package.json` `"check"` script to run `node --check` on `src/diff.js`, `src/parser.js`, `src/indexer.js`, and `src/library.js`.

5. Create `test/parser.test.js` using ONLY `node:test` and `node:assert/strict` with temporary `os.tmpdir()` fixtures testing `diffLines`, mutation `replay` (including prototype-pollution protection), `parseWorkspaceYaml`, discovering & loading both a VS Code `chatSessions` session and a `.copilot/session-state` `events.jsonl` session, and searching across both via `createLibrary`. Run `npm test` and fix any issues until all tests pass!
```

*(Allow Copilot to run `npm test` in the terminal when prompted!)*

---

## Step 2 — Run the Tests Yourself!

Once Copilot finishes, click into your VS Code Terminal (`` Ctrl+` ``) and run:

```powershell
npm test
```

### What You Should See
Every test in `test/parser.test.js` prints `ok` (`pass` with `fail 0`)—and notice how fast it ran with **zero `node_modules`**!

### What Just Happened?
- `src/diff.js` compares old and new code line-by-line so you can see green `+` additions and red `-` deletions.
- `src/parser.js` turns raw `.jsonl` logs from both VS Code Chat and Copilot Agent sessions into a clean tree of Prompts → Thoughts, Tool Calls, Replies, and File Edits.
- `src/library.js` + `src/indexer.js` index your chats in a background Node worker and let you search every word instantly.

---

## 🛟 Quick Rescue Prompt (Only If a Test Fails)

If `npm test` reports any error, paste this into Copilot Chat:
```text
Run `npm test`, inspect the failing assertion, and fix the bug in `src/` without adding any npm packages until all tests pass.
```

---

## ✅ Lab 02 Checkpoint

- [x] `src/diff.js`, `src/parser.js`, `src/indexer.js`, and `src/library.js` exist.
- [x] `npm test` passes with `0` failures and zero external packages.

👉 **Next up: [Lab 03 — Zero-Package Local Web Server](./Lab-03-Zero-Package-Web-Server.md)**
