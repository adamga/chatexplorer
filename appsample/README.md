# Chronicle / Chat Explorer

A local-only Node.js application for exploring raw VS Code chat history. A prompt-first tree connects messages, recorded reasoning, tools, model selections, file edits, and original persistence events to a rich content inspector.

## Run

Requires **Node.js 22 or newer**. No npm, npx, or package install is needed for the web server or unit tests. Run these commands from `appsample/`.

```powershell
node --max-old-space-size=8192 src/server.js
```

Open **http://127.0.0.1:3210**. The app opens on the **Library**, where every session from imported paths is listed and grouped by workspace. The supplied sample in `chatsessions` loads automatically.

To browse your whole history, open the folder that contains all workspace hash folders (for example `%APPDATA%\Code\User\workspaceStorage`, or a copy of it). Chronicle finds every valid session and ignores everything else: databases, caches, extension data, and stray files.

Use **Scan locations** to manage legacy VS Code and Agent Host / CLI locations in one dialog. Browse folders (including drives and parent folders), or enter a path; **Check location**, then **Add location**. Click a listed path to populate the editor, browse from there or hand-edit it, check again, then **Update location**. The red **×** removes a location from the list. **Save and scan** persists the full list and refreshes the library; removing a location never deletes history files. Overlapping locations retain any sessions still covered by another listed location. An explicitly empty saved list stays empty on restart.

The desktop app uses a native picker starting from the edited path; the web app provides an in-dialog folder browser. **VS Code default** and **Agent / CLI default** fill the editor without changing the saved list. Paths that cannot be scanned are shown as errors rather than silently ignored.

Alternatively, pass a location at startup:

```powershell
node --max-old-space-size=8192 src/server.js --path "C:\Users\you\AppData\Roaming\Code\User\workspaceStorage\workspace-hash"
```

Accepted inputs:

- A VS Code workspace storage hash folder, or a parent `workspaceStorage` folder (`%APPDATA%\Code\User\workspaceStorage`).
- An Agent Host / Copilot CLI `session-state` folder (`%USERPROFILE%\.copilot\session-state`), an individual session UUID directory, `events.jsonl`, or `workspace.yaml`.
- A `chatSessions` folder (also `emptyWindowChatSessions` / `transferredChatSessions`).
- A persisted session `.jsonl` or older `.json` file.
- `state.vscdb`, as a convenient pointer to its sibling `chatSessions` folder. Chronicle does not extract chat messages from the database itself.

Keep the **whole workspace storage folder** together for the richest history. The SQLite database alone is not the transcript. Imported paths are saved in `.chat-explorer.json` and reloaded on restart. The explorer reads a point-in-time view; it does not watch live sessions. **Scan for Updates** at the top right rereads saved locations, discovers new or changed sessions and sidecars, retries failed indexing, removes deleted sessions, and refreshes the open session or workspace. **Scan status** shows progress, completion time and errors. Unavailable locations retain their last-known data with an explicit warning. Scanning does not download pricing, update the application, cloud-sync histories, or recover data that was never persisted.

## Windows desktop app (optional maintainer workflow)

Chronicle also ships as an Electron desktop app with a Windows installer. Running a prebuilt installer does not require npm. Running Electron from source or building the installer uses npm and build-only dependencies; neither is a workshop requirement.

```powershell
npm ci            # install optional maintainer tooling from the lockfile
node build/render-icon.cjs
npm run desktop   # run the desktop app from source
npm run dist      # build dist\Chronicle-Setup-<version>.exe (NSIS, x64)
npm run pack      # unpacked app only, in dist\win-unpacked
```

- The installer is per-user (no admin needed), lets you pick the install folder, and adds Start menu and desktop shortcuts.
- The backend runs in an Electron **utility process** on a random loopback port. If it crashes, it restarts automatically on the same port and the window reloads. Search indexes are cached in `%APPDATA%\Chronicle\index-cache`.
- **Scan locations** (`Ctrl+O`) opens the combined location manager. `Ctrl+Shift+O` opens the same dialog with the Agent / CLI default selected; both defaults are also available as buttons.
- Paths passed on the command line (`Chronicle.exe "C:\...\workspace-hash"`) are imported; a second launch forwards its paths to the running window.
- Imported paths are remembered in `%APPDATA%\Chronicle\settings.json`. The bundled sample is not included in the installer. Uninstalling keeps these settings.
- The renderer is sandboxed with context isolation and no Node access. External links open in your default browser.
- The installer is unsigned, so Windows SmartScreen may warn on first run. Choose **More info → Run anyway**, or configure code signing in electron-builder.
- Generate the PNG and ICO with `node build/render-icon.cjs`; it needs no package install.

To choose another local port:

```powershell
$env:PORT=3211
node --max-old-space-size=8192 src/server.js
```

## Explore

- **Library:** sessions from both VS Code `workspaceStorage` and Agent Host / Copilot CLI (`.copilot\session-state`) grouped by workspace, sortable by **Date** (newest/oldest) or **Name** (A→Z / Z→A), with prompt and tool counts, models, and size. Sessions with no prompts are hidden and counted. A progress bar shows background indexing. The sidebar filter narrows sessions by title or workspace. Click a session to drill in; the back button returns to the workspace or library.
- **Workspace overview:** click a repo/folder/workspace heading in the sidebar or library. The right pane rolls up all indexed member sessions: prompts, tool calls, edits, reasoning, tokens, estimated USD cost, AI credits, and model breakdowns. Chronological session bars are colored by model; select a session to inspect its turns, then return to the workspace. Same-named folders at different paths stay separate; Windows path case variations share a group. Pending/failed sessions and incomplete usage are explicitly labeled. Latest session aggregate snapshots remain separate from per-turn totals. **Download usage report** exports deterministic Markdown without an AI call (`/api/workspaces/<id>/usage` exposes JSON). **Create workspace summary** uses the existing Foundry configuration, reads every member session in chronological order with session boundaries, and appends the exact usage report. All members must finish indexing successfully first.
- **Saved summaries:** completed workspace and session summaries are retained as separate versions in `appsample\summaries` by default, with the workspace/session name, UTC generation date/time, and a unique suffix in each Markdown filename. A small `.summary.json` sidecar associates each version with its workspace/session. **View summaries** appears in the corresponding overview when saved documents exist, including after restarting the app; the completion dialog also offers **View summary**. The near-full-screen viewer renders headings, tables, lists, and highlighted code, with a version selector, **Print** (including browser Save to PDF), **Save As...** (Markdown; download fallback on browsers without a file picker), and **Copy** (original Markdown). Printing includes the whole document, not the surrounding app or controls. Older workspace summaries whose filenames contain the workspace ID are also recognized; their displayed date is the file modification time. Saved documents are untrusted and use the same allowlisted renderer as conversations, without loading external images. `SUMMARY_OUTPUT_DIR` overrides storage; relative paths resolve from the app/configuration root. Isolated `CHRONICLE_DATA_DIR` and installed desktop builds use their writable application-data root instead. Only the currently configured summary folder is listed. Summaries and sidecars are git-ignored; they may contain sensitive chat content.
- **Global search (`Ctrl+Shift+F`):** searches prompts, responses, reasoning, tool titles, arguments, and results, plus edits, across **all sessions** or **this session**. All terms must match, case-insensitive. Each result shows a one-line highlighted blurb. Clicking it opens that session at the exact entry with matches highlighted, and **← Results** returns to the list.
- **Left:** prompts at the first level; responses, reasoning blocks, tools, edits, context, and source events beneath their prompt. Expand tool items for linked execution events.
- **Right:** selecting a prompt opens its **Conversation story**, with replies, saved reasoning, summaries, tool activity, and edits inline rather than a list of links. More items load automatically as you scroll. Original transcript/debug groups expand in place to avoid duplicating the primary narrative.
- **Read full session:** the book icon in the rail, or the overview button, reads every prompt and its activity as one continuous story. The tree remains available for detailed inspection. **Raw record** preserves fields without a dedicated renderer.
- **Tool results:** model-facing `result.content`, saved detailed display output (`result.detailedContent`), and structured `result.contents` blocks are shown separately in tool details and conversation stories, included in summaries, and searchable. Concise output may be truncated; detailed output is not guaranteed complete either. Structured media/resource references stay inspectable as data without loading them. Older undifferentiated output remains labeled as such. Explicitly empty results remain visible.
- **Tips:** the top-right checkbox toggles small explanatory bubbles throughout usage and tool views. Hover, focus or click a **?** for an explanation; the preference is remembered in this browser. Essential accounting limitations and source warnings remain visible with tips off.
- **Create session summary:** beside **Read full session** on the session overview, generates a compact, comprehensive `<session-name>-summary.md` handoff document using your configured **Microsoft Foundry Agent** so another engineer or agent on a separate machine can resume the task without prior chat history. Includes a `.env`-backed configuration dialog with connectivity testing, a live progress dialog, and a popup operation log window with clipboard copy support. See [`agentconfig/`](./agentconfig/README.md) for Foundry Portal agent prompt and Service Principal setup instructions.
- **Session overview:** counts, source availability, conversation navigation, and model timeline. Expand its chevron for saved file snapshots, model catalog, editing state, workspace metadata, and original mutation records.
- **AI credits:** each session overview has a usage summary (tokens, estimated USD cost, AI credits, model subtotals), a model-colored bar for every turn, and a running attributed subtotal. **Download credit report** exports the complete session, turn, model, and intermediate usage breakdown as Markdown without calling an AI service. The same data is available as JSON at `/api/sessions/<id>/usage`. Click a bar to open that prompt. Expand a prompt's token-info bubble for input, cached input, cache writes, output, reasoning, and intermediate model-call credit components when recorded. Usage-bearing intermediate messages/events also have bubbles.
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

**Credit estimates, not invoices.** `src/copilot-pricing.json` stores GitHub's published text-model USD rates per million tokens, source URL, date checked, long-context thresholds, and announced promotional changes. One AI credit equals $0.01 USD. The app reads this local file without contacting GitHub at runtime; edit it from the linked official pricing page and restart to refresh rates. Pricing-file changes invalidate the search-index cache. The snapshot is a reference-price estimate, not a historical rate ledger; legacy premium-request multipliers, plan allowances/discounts, images, and non-Copilot/BYOK billing are not included. Unknown models and expired promotions without a published successor are unpriced.

Per-turn usage comes from saved request token totals or individual usage-bearing assistant messages / `assistant.usage` events; detailed calls take precedence over request totals to avoid counting both. Call IDs (including accounting identities) and replay-checkpoint flags prevent duplicate accounting. Matching sidecar timestamps and token counts without a shared call ID are treated as one entry with an explicit uncertainty note. Normalized Copilot/OpenAI input is treated as inclusive of cache reads/writes; native Anthropic `input_tokens` with cache fields is converted from exclusive input. Reasoning is already included in output and is never charged twice. Missing cache counts use zero **only for a visibly incomplete estimate**, not as recorded facts. Missing/invalid input or output, inconsistent cache counts, and unknown prices remain unavailable rather than becoming zero-credit bars.

Some Copilot versions do **not persist per-call usage**. Session shutdown / usage-checkpoint model totals appear in a separate latest-aggregate panel, never allocated to the final turn or added to per-turn costs. Aggregate-only records cannot determine per-call long-context tiers; those estimates are labeled default-tier and incomplete. Usage recorded before the first prompt or with an unresolved explicit interaction ID is included in the session summary's **Usage without a turn association** section rather than guessed into a turn. Running subtotals include only attributable priced usage; `*` marks incomplete estimates. Use **Scan for Updates** to recalculate after more events have been saved. This retains the app's point-in-time, read-only behavior rather than watching or changing live history.

**Runtime-reported consumption stays separate.** Durable `session.usage_checkpoint.totalNanoAiu` values (and shutdown totals when present) are retained with timestamps, event type and source. The latest valid root-session checkpoint is used, not the maximum or sum; duplicate sidecar checkpoints are deduplicated and subagent cumulative totals are excluded to avoid counting children twice. Raw nano-AIU and normalized AI units (nano-AIU / 1e9) are shown in session/workspace summaries and usage reports, without assuming a USD or AI-credit conversion. Workspace totals count each covered session once and show missing coverage. Missing, unsafe or negative counts are never treated as zero; zero is valid. Missing timestamps and decreasing counters produce explicit warnings. These snapshots may predate the final activity and cannot reconstruct per-turn or missing ephemeral usage.

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
node --max-old-space-size=8192 --watch src/server.js
node --test
node --check src/server.js
```

The parser tests cover mutation replay, partial logs, unsafe keys, model changes, tool enrichment, missing snapshots, UTF-16/CRLF edits, baselines, and the supplied real session. Tests create and remove their own temporary fixtures; the original session is not changed.

Use `node --check <file>` for each changed JavaScript file. For optional maintainer browser checks, first run `npm ci`; Playwright starts an isolated server on port 3211 with a temporary data folder:

```powershell
npx playwright test
```

`e2e\desktop.spec.js` launches the Electron app itself with a temporary profile. On first use, if Playwright reports that its browser executable is missing, run `npx playwright install chromium --only-shell`.
