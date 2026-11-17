# Chronicle / Chat Explorer

A local-only Node.js application for exploring raw VS Code chat history. A prompt-first tree connects messages, recorded reasoning, tools, model selections, file edits, and original persistence events to a rich content inspector.

## Run

Requires **Node.js 22 or newer** — **zero runtime npm package dependencies** (runs directly on built-in Node.js modules with no `npm install` needed for the web server or unit tests).

```powershell
npm start
```

Open **http://127.0.0.1:3210**. The app opens on the **Library**, where every session from imported paths is listed and grouped by workspace. The supplied sample in `chatsessions` loads automatically.

To browse your whole history, open the folder that contains all workspace hash folders (for example `%APPDATA%\Code\User\workspaceStorage`, or a copy of it). Chronicle finds every valid session and ignores everything else: databases, caches, extension data, and stray files.

Use **Open session** to enter a local path, or pass one at startup:

```powershell
npm start -- --path "C:\Users\you\AppData\Roaming\Code\User\workspaceStorage\workspace-hash"
```

Accepted inputs:

- A VS Code workspace storage hash folder, or a parent `workspaceStorage` folder (`%APPDATA%\Code\User\workspaceStorage`).
- An Agent Host / Copilot CLI `session-state` folder (`%USERPROFILE%\.copilot\session-state`), an individual session UUID directory, `events.jsonl`, or `workspace.yaml`.
- A `chatSessions` folder (also `emptyWindowChatSessions` / `transferredChatSessions`).
- A persisted session `.jsonl` or older `.json` file.
- `state.vscdb`, as a convenient pointer to its sibling `chatSessions` folder. Chronicle does not extract chat messages from the database itself.

Keep the **whole workspace storage folder** together for the richest history. The SQLite database alone is not the transcript. Imported paths are saved in `.chat-explorer.json` and reloaded on restart. Reimport a path to refresh its contents. The explorer reads a point-in-time view; it does not watch live sessions.

## Windows desktop app

Chronicle also ships as an Electron desktop app with a Windows installer.

```powershell
npm run desktop   # run the desktop app from source
npm run dist      # build dist\Chronicle-Setup-<version>.exe (NSIS, x64)
npm run pack      # unpacked app only, in dist\win-unpacked
```

- The installer is per-user (no admin needed), lets you pick the install folder, and adds Start menu and desktop shortcuts.
- The backend runs in an Electron **utility process** on a random loopback port. If it crashes, it restarts automatically on the same port and the window reloads. Search indexes are cached in `%APPDATA%\Chronicle\index-cache`.
- **Open session** (`Ctrl+O`) and **Agent sessions** (`Ctrl+Shift+O`) provide separate open browsers pre-filled and defaulted to `%APPDATA%\Code\User\workspaceStorage` and `%USERPROFILE%\.copilot\session-state` respectively.
- Paths passed on the command line (`Chronicle.exe "C:\...\workspace-hash"`) are imported; a second launch forwards its paths to the running window.
- Imported paths are remembered in `%APPDATA%\Chronicle\settings.json`. The bundled sample is not included in the installer. Uninstalling keeps these settings.
- The renderer is sandboxed with context isolation and no Node access. External links open in your default browser.
- The installer is unsigned, so Windows SmartScreen may warn on first run. Choose **More info → Run anyway**, or configure code signing in electron-builder.
- Icons are generated from `build\icon.svg` with `npm run icon`.

To choose another local port:

```powershell
$env:PORT=3211
npm start
```

## Explore

- **Library:** sessions from both VS Code `workspaceStorage` and Agent Host / Copilot CLI (`.copilot\session-state`) grouped by workspace, sortable by **Date** (newest/oldest) or **Name** (A→Z / Z→A), with prompt and tool counts, models, and size. Sessions with no prompts are hidden and counted. A progress bar shows background indexing. The sidebar filter narrows sessions by title or workspace. Click a session to drill in; **← Library** returns.
- **Global search (`Ctrl+Shift+F`):** searches prompts, responses, reasoning, tool titles, arguments, and results, plus edits, across **all sessions** or **this session**. All terms must match, case-insensitive. Each result shows a one-line highlighted blurb. Clicking it opens that session at the exact entry with matches highlighted, and **← Results** returns to the list.
- **Left:** prompts at the first level; responses, reasoning blocks, tools, edits, context, and source events beneath their prompt. Expand tool items for linked execution events.
- **Right:** selecting a prompt opens its **Conversation story**, with replies, saved reasoning, summaries, tool activity, and edits inline rather than a list of links. More items load automatically as you scroll. Original transcript/debug groups expand in place to avoid duplicating the primary narrative.
- **Read full session:** the book icon in the rail, or the overview button, reads every prompt and its activity as one continuous story. The tree remains available for detailed inspection. **Raw record** preserves fields without a dedicated renderer.
- **Create session summary:** beside **Read full session** on the session overview, generates a compact, comprehensive `<session-name>-summary.md` handoff document using your configured **Microsoft Foundry Agent** so another engineer or agent on a separate machine can resume the task without prior chat history. Includes a `.env`-backed configuration dialog with connectivity testing, a live progress dialog, and a popup operation log window with clipboard copy support. See [`agentconfig/`](./agentconfig/README.md) for Foundry Portal agent prompt and Service Principal setup instructions.
- **Session overview:** counts, source availability, conversation navigation, and model timeline. Expand its chevron for saved file snapshots, model catalog, editing state, workspace metadata, and original mutation records.
- **Session filter:** inside a session, the sidebar search filters the tree using complete recorded payloads, not just visible titles. Filters narrow messages, tools, edits, or thoughts.
- **Model timeline:** detects changes between request model IDs; each prompt retains its recorded model/configuration. Subagent model metadata stays with its tool.
- **File edit history:** chronological edit operations reconstructed using saved baselines and UTF-16 edit ranges. **Saved file snapshots** compares the session-wide original with its saved current version, not a single prompt.
- **Export:** downloads the reconstructed primary session JSON. Sidecar files remain available through their original records; the export is not an archive of the entire workspace.
- **Keyboard:** `Ctrl/Cmd K` focuses search; arrow keys navigate and expand/collapse the tree; `Enter` opens an item. The sidebar is resizable. Light and dark themes are supported.

Chronicle reads sources without modifying them, never executes recorded tools, and serves fonts/scripts locally. It binds only to `127.0.0.1`, rejects cross-origin requests, blocks embedded HTML execution, and does not fetch remote images. There are no cloud services or telemetry. This is a trusted-local-user utility, **not an authenticated multi-user server**; do not expose it through a proxy or port-forward.

## Supported sources and limitations

| Source | Used for |
|---|---|
| `chatSessions\<id>.jsonl` | Snapshot + mutation replay; canonical prompts, responses, tools, reasoning markers, metadata |
| `chatSessions\<id>.json` | Older full-session snapshots |
| `GitHub.copilot-chat\transcripts\<id>.jsonl` | Agent messages, tool arguments, execution events |
| `GitHub.copilot-chat\debug-logs\<id>\main.jsonl` | Additional recorded debug events |
| `GitHub.copilot-chat\debug-logs\<id>\models.json` | Recorded model catalog |
| `chatEditingSessions\<id>\state.json` and `contents\*` | Edit operations, baselines, checkpoints, and exact saved content snapshots |
| `workspace.json` | Workspace identity |

These are internal, version-dependent formats. Unknown response parts remain inspectable as structured/raw records. Malformed JSONL records, missing blobs, and unreconstructable edits produce visible source warnings. No data is invented to hide a parse failure. Original source events may duplicate rendered conversation content; they are intentionally retained in separate source groups.

**Reasoning is available only if its text was persisted.** Empty values, completion markers, and opaque/encrypted reasoning IDs cannot be turned into readable reasoning. Compacted or truncated history cannot be recovered from absent data. File references are displayed but never followed to arbitrary workspace files; attached resources are represented by their recorded metadata, not loaded as live files. Notebook edits remain structured records rather than reconstructed notebook diffs.

**Large histories.** Each session is indexed once in a separate child process, smallest first, so the library becomes searchable quickly. A compact text corpus and summary are cached to disk (`.chat-explorer-cache` for the web app) and reused until the session's files change; size and mtime are checked. Opening a session parses it fully: a 460 MB session takes about 3 seconds and up to about 2.5 GB of memory. Only a bounded set of opened sessions is kept in memory (LRU). Raw records above about 1 MB are shown truncated, and the original file is never altered. If a session cannot be indexed (for example, it runs out of memory), it is listed with its error and the rest of the library continues. Search covers indexed sessions; results note how many are still pending.

### Format research

Implementation was checked against the sample and Microsoft's upstream source, rather than treating JSONL as a list of chat messages:

- [Object mutation log](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/chat/common/model/objectMutationLog.ts): `kind: 0` snapshot, `1` property set, `2` append/truncate (optional `i` drops everything from that index), `3` property deletion.
- [Chat session store](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/chat/common/model/chatSessionStore.ts): workspace storage layout and session persistence.
- [Chat editing operations](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/chat/browser/chatEditing/chatEditingOperations.ts): epochs, per-request baselines, create/delete/rename/text/notebook operations.
- [Editor text model](https://github.com/microsoft/vscode/blob/main/src/vs/editor/common/model/textModel.ts): edit ranges and end-of-file clamping.

## Development

Zero runtime npm dependencies: plain browser JavaScript, SVG icons, GFM Markdown + HTML sanitizer + syntax highlighter, a native `node:http` server, a pure-JS Myers line-diff engine, and an isolated session parser. No bundler or build step.

```powershell
npm run dev
npm test
npm run check
```

The parser tests cover mutation replay, partial logs, unsafe keys, model changes, tool enrichment, missing snapshots, UTF-16/CRLF edits, baselines, and the supplied real session. Tests create and remove their own temporary fixtures; the original session is not changed.

For browser checks (Playwright starts an isolated server on port 3211 with a temporary data folder):

```powershell
npx playwright test
```

`e2e\desktop.spec.js` launches the Electron app itself with a temporary profile. On first use, if Playwright reports that its browser executable is missing, run `npx playwright install chromium --only-shell`.
