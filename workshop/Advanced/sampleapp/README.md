# Chronicle / Chat Explorer (Baseline Web App)

A local-only, **zero-package** Node.js web application for loading, browsing, searching, and inspecting persisted VS Code (`workspaceStorage`) and Copilot Agent (`.copilot\session-state`) chat sessions.

## Run

Requires **Node.js 22 or newer** — zero external npm packages required.

```powershell
npm start
```

Open **http://127.0.0.1:3210** in your browser.

- Click **Open session** (`Ctrl+O`) to load VS Code `workspaceStorage` history (pre-filled with your device default).
- Click **Agent sessions** (`Ctrl+Shift+O`) to load Agent Host / Copilot CLI `.copilot\session-state` history (pre-filled with your device default).
- Sort sessions by **Date** or **Name**, search across every session (`Ctrl+Shift+F`), inspect prompts, responses, persisted reasoning, tool calls, and reconstructed file diffs, or read an entire conversation continuously.

## Validate

```powershell
npm run check
npm test
```
