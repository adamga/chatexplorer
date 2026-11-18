# Lab 01 — Teaching Copilot Your Ground Rules (`copilot-instructions.md`)

⏱️ **Estimated Time:** 8 minutes

---

## Why Do We Need an Instructions File?

Normally, if you ask an AI coding assistant *"Build me a Node.js web app with Markdown and icons"*, its first instinct is to run `npm install express marked dompurify highlight.js lucide diff`—downloading **dozens or hundreds** of outside packages into a giant `node_modules` folder!

What happens when outside packages break, get blocked by a school or company firewall, or go out of date? Your app stops working!

VS Code has a special superpower: if you create a file at **`.github/copilot-instructions.md`**, GitHub Copilot automatically reads that file on **every single prompt** and obeys your project rules!

In this lab, we will ask Copilot to create:
1. `.github/copilot-instructions.md` — locking in our **Zero-Package Rule** (Node.js built-in modules + plain browser code only).
2. `package.json` — so we can run `npm start`, `npm test`, and `npm run check` using built-in Node commands with **no `"dependencies"` section at all**.
3. `.gitignore` — to keep temporary cache files out of Git.

---

## Step 1 — Send Your First Prompt to Copilot

Copy everything inside the box below, paste it into **Copilot Chat (Agent mode)**, and press **Enter**:

```text
We are starting a new local-only Node.js web application called "Chronicle / Chat Explorer" in this workspace (leave any pre-existing notes or files untouched).

First, set up our project foundation by creating ONLY these 3 files (do not create `src/` or `public/` files yet—we will build those in upcoming steps):

1. `.github/copilot-instructions.md` with clear, strict coding rules for every future prompt:
   - ZERO NPM PACKAGES ALLOWED: Never run `npm install`, never add `"dependencies"` or `"devDependencies"` to `package.json`, and never import third-party packages. Design and write every feature directly into our own source code (`src/` and `public/`).
   - Backend (`src/`): Use ES modules (`import`/`export`) and ONLY built-in Node.js modules (`node:http`, `node:fs`, `node:fs/promises`, `node:path`, `node:os`, `node:url`, `node:crypto`, `node:child_process`, `node:perf_hooks`).
   - Tests (`test/`): Use ONLY Node's built-in test runner (`node:test` and `node:assert/strict`).
   - Frontend (`public/`): Use plain browser HTML, CSS, JavaScript, inline SVG icons, and our own in-repo Markdown parser, strict DOM allowlist HTML sanitizer, and syntax highlighter. Never load scripts, fonts, or styles from external CDNs or `/vendor/` paths.
   - Read-only & Local Security: Never modify original chat session files on disk, bind the HTTP server strictly to `127.0.0.1`, block cross-origin requests (`403`), and sanitize all rendered HTML.

2. `package.json`:
   - `"name": "chat-explorer"`, `"version": "1.0.0"`, `"private": true`, `"type": "module"`
   - `"scripts"`:
     - `"start": "node --max-old-space-size=8192 src/server.js"`
     - `"dev": "node --max-old-space-size=8192 --watch src/server.js"`
     - `"test": "node --test"`
     - `"check": "node -e \"JSON.parse(require('node:fs').readFileSync('package.json','utf8'))\""`
   - Do NOT include `"dependencies"` or `"devDependencies"`.

3. `.gitignore` ignoring `node_modules/`, `.chat-explorer.json`, `.chat-explorer.json.*.tmp`, `.chat-explorer-cache/`, and `*.log`.
```

When Copilot finishes, click **Keep** (if prompted to accept file edits).

---

## Step 2 — Peek Inside `.github/copilot-instructions.md`

1. In the VS Code **Explorer** sidebar on the left, click `.github/copilot-instructions.md` to open it.
2. Read through the rules Copilot wrote. Notice how clear they are!
3. Also open `package.json` and confirm there is **no `"dependencies"` block** anywhere in the file.

> 💡 **Kid-Friendly Pro Tip:** From this moment on, look at the **References** toggle at the top of Copilot's replies in Chat—you'll see `.github/copilot-instructions.md` listed automatically on every turn! That means you never have to repeat *"don't use npm packages"* in every single prompt, though reminding it on big tasks keeps it laser-focused.

---

## ✅ Lab 01 Checkpoint

- [x] `.github/copilot-instructions.md` exists and enforces the zero-package rule.
- [x] `package.json` exists with `"type": "module"` and has **no `"dependencies"`**.
- [x] `.gitignore` exists.

👉 **Next up: [Lab 02 — Reading Chat History & File Diffs](./Lab-02-Session-Parser-and-Diff-Engine.md)**
