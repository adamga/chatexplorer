# Lab 04 — Building the Interactive Browser Explorer UI

⏱️ **Estimated Time:** 20 minutes

---

## Bringing Chronicle to Life in the Browser!

Our backend can now discover, parse, diff, index, and serve chat history—all without a single external package. Now let's build a fast, readable, modern browser interface in `public/`!

Remember our rule in `.github/copilot-instructions.md`: we won't load external icon libraries, Markdown libraries, or syntax-highlighting libraries from `npm` or CDNs. Instead, we'll build two clean helper scripts first (`public/icons.js` and `public/markdown.js`), and then build our main Chronicle app (`public/index.html`, `public/styles.css`, and `public/app.js`)!

---

## Step 1 — Prompt Copilot to Build Native Icons, Markdown, Sanitizer & Code Highlighter

Copy the prompt below, paste it into **Copilot Chat (Agent mode)**, and press **Enter**:

```text
Let's create our zero-dependency browser rendering helpers in `public/`:

1. `public/icons.js`:
   - Attach `globalThis.chronicleIcons = { ICONS, svg(name, className), createIcons({ root, attrs }) }`.
   - Include clean 24x24 stroke `<svg>` vector paths (`fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"`) for UI icons used in a chat explorer: `orbit`, `panels-top-left`, `book-open`, `library`, `text-search`, `cpu`, `sun`, `circle-help`, `search`, `folder-plus`, `bot`, `hard-drive`, `arrow-left`, `lock-keyhole`, `fold-vertical`, `unfold-vertical`, `arrow-up`, `arrow-down`, `arrow-up-down`, `arrow-down-a-z`, `arrow-up-right`, `download`, `git-branch`, `folder-open`, `info`, `shield-check`, `x`, `message-square`, `messages-square`, `sparkles`, `brain`, `terminal`, `file-diff`, `activity`, `folder`, `folder-git-2`, `paperclip`, `file-code-2`, `chevron-down`, `chevron-right`, `circle`, `triangle-alert`, `loader`, `scan-search`, `calendar-days`, `hash`, `layers`, `files`, `flag`, `scan-line`, `database`, `clock-3`, `timer`, `eye-off`, `copy`, `scissors`, `sliders-horizontal`, `git-compare-arrows`, `list-tree`, `corner-down-right`, `fingerprint`.
   - `createIcons` upgrades any `<i data-lucide="name">` placeholders inside `root` into `<svg>` elements.

2. `public/markdown.js`:
   - Attach `globalThis.chronicleMarkdown = { escapeHtml, supportsLanguage, highlightCode, parseMarkdown, sanitizeHtml }`.
   - `highlightCode(code, lang)`: Safe single-pass syntax highlighter wrapping tokens in `<span class="hljs-keyword|string|number|literal|comment|title|attr|variable">` for `javascript`/`typescript`, `json`, `python`, `powershell`, `bash`, `html`/`xml`, `css`, `yaml`, `sql`, `markdown`, and `diff` (escaping all HTML).
   - `parseMarkdown(text, { renderCodeBlock })`: Render GFM headings, fenced code blocks (supporting nested backtick lengths), blockquotes, tables, ordered/unordered/nested/task lists, horizontal rules, inline code, links, images, bold, italic (without breaking `snake_case_names`), and strikethrough, while safely escaping unknown `<placeholder>` tags.
   - `sanitizeHtml(html)`: Strict `DOMParser` allowlist HTML sanitizer that removes `<script>`, `<style>`, `<iframe>`, `<form>`, `<input>`, `<button>`, `<object>`, `on*` event attributes, `style`, `srcset`, `data-*`, and `javascript:`/`vbscript:`/`data:` link URLs (keeping only safe formatting/table/code tags and trusted `hljs-*` / `code-block` classes).

3. Verify syntax quickly with `node --check public/icons.js && node --check public/markdown.js` (do not start background web servers or browser/DevTools MCP tools yet—we will build `index.html` next and launch the browser in Step 3).
```

---

## Step 2 — Prompt Copilot to Build the Chronicle Explorer App (`index.html`, `styles.css`, `app.js`)

Now copy this second prompt into **Copilot Chat (Agent mode)** and press **Enter**:

```text
Now build the complete Chronicle browser UI in `public/index.html`, `public/styles.css`, and `public/app.js` (zero external fonts, CDNs, or packages—use native system UI fonts and our `icons.js` + `markdown.js`):

1. Layout & Styling (`public/index.html` & `public/styles.css`):
   - Left icon rail (`#home-button` Session overview, `#story-button` Read full session, `#library-button` Session library, `#global-search-button` Search all sessions, `#models-button` Model timeline, `#theme-button` Dark/Light theme toggle, `#help-button` Help/shortcuts dialog), top bar with global search (`#global-search`, `All sessions` / `This session`, `Ctrl+Shift+F`), resizable left sidebar (`#sidebar`), main reader pane (`#reader`) with breadcrumb + previous/next/export JSON actions, and bottom status bar.
   - Readability & Contrast: Use comfortable, clearly legible font sizes (`14px` base body, `13px–14.5px` session list rows and cards, `11px–12px` metadata—never tiny `8px` text!). Support both a sleek Dark theme and a crisp, high-contrast Light ("White") theme (`body.light`) with white card/sidebar surfaces (`#ffffff`) and deep, dark readable text colors (avoid washed-out pale grays!).

2. Two Separate Defaulted "Open" Browsers:
   - Top bar button **"Open session"** (`#open-button`, `Ctrl+O`): Opens `<dialog id="open-dialog">` specifically for **VS Code `workspaceStorage`** sessions, automatically pre-filled with `defaultPaths.vscodeStorage` returned from `/api/sessions` (plus a "Reset to device default" button and a quick link to switch to the Agent browser).
   - Top bar button **"Agent sessions"** (`#open-agent-button`, `Ctrl+Shift+O`): Opens `<dialog id="open-agent-dialog">` specifically for **Agent Host / Copilot CLI (`.copilot\session-state`)** sessions, automatically pre-filled with `defaultPaths.agentSessions` (plus a "Reset to device default" button).

3. Sortable Session Library & Workspace Grouping (`public/app.js`):
   - Group sessions by workspace folder, badging Agent Host sessions with an `Agent` tag, and show a live indexing progress bar while background indexing runs.
   - Make the session list **sortable** in both the sidebar and the Library page toolbar by **Date (Newest first)**, **Date (Oldest first)**, **Name (A → Z)**, and **Name (Z → A)**, persisted in `localStorage`.

4. Deep Session Inspection:
   - Clicking a session loads its **Session overview** (metrics for prompts, tool calls, file edits, reasoning blocks; prompt previews; model timeline; connected sources; and **Read full session** button) and populates the sidebar explorer tree (filterable by All activity, Messages, Tools, Edits, Thoughts, and text search `Ctrl+K`, plus arrow-key navigation).
   - Clicking a prompt renders its **Conversation story** inline (streaming pages from `/api/sessions/:id/story` with `IntersectionObserver`), showing replies, persisted reasoning, tool commands/inputs/outputs, and file changes, plus a **Raw record** JSON tab with Copy support.
   - Clicking a file edit renders a line-numbered `+` / `−` diff view alongside **Before**, **After**, and **Raw record** tabs.
   - **Read full session** streams the entire multi-turn conversation chronologically.
   - Sanitize all rendered Markdown links so `http(s)://` opens safely with `rel="noopener noreferrer"` and local file references are disabled rather than executed.

5. Run `node --check` separately on `public/icons.js`, `public/markdown.js`, and `public/app.js`, then run `node --test`. Leave `package.json` unchanged. Do not launch browser/DevTools MCP tools or leave background servers running; the learner starts the server in Step 3.
```

---

## Step 3 — Launch Chronicle and Explore Your Own Chats! (5 Minutes)

Let's start your brand-new zero-package application!

1. In your VS Code Terminal (`` Ctrl+` ``), run:
   ```powershell
   node --max-old-space-size=8192 src/server.js
   ```
2. Hold `Ctrl` and click **http://127.0.0.1:3210** (or open that URL in Edge / Chrome).
3. Try out everything you built:
   - **Load Classic VS Code Chats:** Click **Open session** in the top-right corner. Notice it is *already pre-filled* with your computer's `workspaceStorage` path! Click **Explore session** to scan all your workspaces.
   - **Load Agent / CLI Chats:** Click **Agent sessions** in the top-right corner. Notice it is *already pre-filled* with your `.copilot\session-state` path! Click **Explore agent sessions**—you'll even see **the very workshop chat you're having right now**!
   - **Sort & Theme:** Sort your sessions by **Name (A → Z)** and **Date (Newest first)**, then click the **Sun** icon in the bottom-left rail to toggle between Dark Mode and high-contrast Light Mode.
   - **Inspect a Conversation:** Click any session → click **Read full session**, or expand a Prompt in the left sidebar to inspect Copilot's saved **Reasoning**, **Tool calls**, and **Before/After File Diffs**!
   - **Global Search:** Press `Ctrl+Shift+F`, search for a word across **All sessions**, and click a highlighted result to jump straight to that moment in history.

*(When you're done exploring, press `Ctrl+C` in the terminal to stop the server.)*

---

## 🎉 Congratulations! What You Accomplished in 60 Minutes

Starting from an **empty folder** with **zero external npm packages**, you used VS Code, `.github/copilot-instructions.md`, and a frontier model in Copilot Agent Mode to build:
- [x] A persistent zero-dependency instruction guardrail (`.github/copilot-instructions.md`)
- [x] A pure-JS Myers line-diff engine & dual-format chat parser (`workspaceStorage` + `.copilot\session-state`)
- [x] A background child-process search indexer with disk caching
- [x] A hardened `127.0.0.1` `node:http` web server
- [x] A complete browser observatory with inline SVG icons, GFM Markdown + HTML sanitizer + syntax highlighter, dual Open dialogs, Date/Name sorting, and Dark/Light themes!

👉 **Ready for the next workshop? Continue to the [Advanced Workshop (`workshop/Advanced`)](../Advanced/README.md) to build an Orchestrator + Multi-Agent Team with Custom Skills, add Microsoft Foundry AI Session Handoff Summaries, and package Chronicle into a Windows Desktop App & Installer!**
