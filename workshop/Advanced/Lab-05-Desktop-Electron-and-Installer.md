# Lab 05 — Desktop Electron Shell, Zero-Package Icon Renderer & Windows Setup Installer

⏱️ **Estimated Time:** 17 minutes

---

## Goal

In our final lab, we will turn Chronicle from a local browser tab into a native **Windows Desktop Application** with a per-user **Windows Setup Installer (`Chronicle-Setup-1.0.0.exe`)**!

### How Do We Keep Our Zero-Package Rule with Electron?
- **Inside the application (`"dependencies"`):** Still **empty (zero runtime npm packages)**! Even our icon generator (`build/render-icon.cjs`, which creates the 512×512 `build/icon.png` and multi-resolution `build/icon.ico`) will be written in pure Node.js using built-in `node:zlib`!
- **Build-only packaging tools (`"devDependencies"`):** Only `electron` (the Chromium/Node desktop binary) and `electron-builder` (the NSIS `.exe` packager) are added as `devDependencies`. When `electron-builder` creates `resources\app.asar`, **zero `node_modules`** are bundled inside your packaged app!
- **`.env` Settings in Desktop Mode:** Installed Windows apps live inside a read-only `app.asar` archive, so `electron/main.mjs` stores writable settings and `.env` in `%APPDATA%\Chronicle\`—and automatically seeds `%APPDATA%\Chronicle\.env` from your local `.env` file on first launch!

---

## Step 1 — Command `Chronicle Orchestrator` to Build the Electron App & Installer Config (10 Minutes)

With **`Chronicle Orchestrator`** selected in Copilot Chat, paste the prompt below and press **Enter**:

```text
Orchestrate our agent team (Developer, Security, Tester, and Documentation) to add the Windows Desktop Electron shell, pure-Node icon generator, and Windows NSIS installer configuration—while keeping `"dependencies"` completely absent so zero `node_modules` are bundled inside `app.asar`:

1. Pure-Node Icon Generator (`build/icon.svg` + `build/render-icon.cjs`):
   - Create `build/icon.svg` (Chronicle dark-emerald rounded square with lime chat bubble and orbit ring).
   - Create `build/render-icon.cjs` using ONLY built-in `node:fs`, `node:path`, and `node:zlib` (`deflateSync` + CRC32 PNG encoder + multi-size `16..256` Windows `.ico` header) to generate `build/icon.png` (512x512) and `build/icon.ico` with zero external packages. Run `node build/render-icon.cjs` to generate both files.

2. Sandboxed Electron Desktop Process Architecture (`electron/main.mjs`, `electron/backend.mjs`, `electron/preload.cjs`):
   - `electron/backend.mjs`: Runs `startServer({ port: options.port ?? 0, dataDir: options.dataDir, paths: options.paths })` inside an Electron `utilityProcess` so parsing multi-hundred-MB chat histories never blocks or crashes the UI window, posting `{ type: 'ready', url, port }` back to `main.mjs`.
   - `electron/preload.cjs`: Uses `contextBridge.exposeInMainWorld('chronicleDesktop', { pick(kind), onOpen(callback) })` allowing kinds `'folder'`, `'file'`, `'agent-folder'`, and `'agent-file'`.
   - `electron/main.mjs`:
     - Enforces single-instance lock, sets `appId` `com.chronicle.chatexplorer`, creates `userData` directory (`%APPDATA%\Chronicle`), and seeds `<userData>\.env` on first run if missing by copying from `CHRONICLE_ENV_FILE`, `process.cwd()/.env`, `dirname(process.execPath)/.env`, or repo `.env` in dev mode!
     - Starts and auto-restarts `electron/backend.mjs` in `utilityProcess.fork` with `--max-old-space-size=8192`.
     - Implements `ipcMain.handle('chronicle:pick', ...)` opening native OS Folder/File dialogs defaulted to `%APPDATA%\Code\User\workspaceStorage` for VS Code picks and `%USERPROFILE%\.copilot\session-state` for Agent picks!
     - Creates `BrowserWindow` with `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, `spellcheck: false`, denies permissions, opens external `http(s)://` URLs via `shell.openExternal`, and in `setWindowOpenHandler` explicitly allows local `${backendUrl}/log.html` popup windows (with matching sandboxed `webPreferences`) so the Summary Operation Log popup works natively on desktop!
     - Adds File menu shortcuts for `Open VS Code session…` (`CmdOrCtrl+O`) and `Open Agent / Copilot CLI sessions…` (`CmdOrCtrl+Shift+O`).

3. Native Picker Buttons in Browser UI (`public/index.html`, `public/app.js`, `public/styles.css`):
   - Add `.desktop-only` native **Folder** and **File** picker buttons inside `#open-dialog`, `#open-agent-dialog`, and `#config-dialog` (`Summary Output Folder`) that appear automatically when `window.chronicleDesktop` is present (`document.body.classList.add('desktop')`).

4. Package & NSIS Setup Configuration (`package.json` + `.gitignore`):
   - Keep `"dependencies"` completely omitted!
   - Add `"main": "electron/main.mjs"`, `"productName": "Chronicle"`, `"author": "Chronicle"`, scripts `"icon": "node build/render-icon.cjs"`, `"desktop": "electron ."`, `"pack": "electron-builder --win dir --x64"`, `"dist": "electron-builder --win nsis --x64"`, and update `"check"` to also check `build/render-icon.cjs`, `electron/main.mjs`, `electron/preload.cjs`, and `electron/backend.mjs`.
   - Add `"devDependencies"` (`"electron": "^45.2.3"`, `"electron-builder": "^26.18.0"`) and `"build"` config targeting Windows x64 NSIS (`perMachine: false`, `oneClick: false`, `allowToChangeInstallationDirectory: true`, desktop & Start Menu shortcuts, packaging `package.json`, `src/**/*`, `public/**/*`, `electron/**/*`, `agentconfig/**/*`, `build/icon.png`—never `.env`!).
   - Ensure `dist/` is in `.gitignore`.

5. Quality Gates:
   - Have `Chronicle Security` audit `electron/main.mjs` and `electron/preload.cjs` against every Electron sandbox rule and confirm `.env` is excluded from `"build.files"`.
   - Have `Chronicle Tester` run `npm run icon && npm run check && npm test`.
   - Have `Chronicle Documentation` update `README.md` with desktop & installer build instructions.
```

---

## Step 2 — Build & Launch Your Windows Desktop App & Setup Program! (7 Minutes)

Once **Chronicle Orchestrator** finishes and all unit/security checks pass, install the Electron packager CLI tools and build your Windows installer in the VS Code Terminal:

```powershell
# 1. Install build-only Electron packager tools (zero runtime app dependencies!)
npm install

# 2. Launch the desktop app directly from source to test native Folder/File pickers & .env seeding
npm run desktop
```

Try clicking **Open session → Folder** and **Agent sessions → Folder** inside the desktop window—notice native Windows Explorer dialogs open directly at `workspaceStorage` and `.copilot\session-state`, and **Summary agent** already has your `.env` settings loaded! Close the desktop window when verified, then build the Windows Setup installer:

```powershell
# 3. Package the Windows Setup Installer (.exe)
npm run dist
```

When `electron-builder` finishes (notice the log line `no node modules found in collection`—confirming **zero `node_modules`** were packed into your app!), check your `dist\` folder:
- **`dist\win-unpacked\Chronicle.exe`** — standalone unpacked desktop executable
- **`dist\Chronicle-Setup-1.0.0.exe`** — full Windows Setup Wizard with install-directory picker, Start Menu shortcut, and Desktop shortcut!

---

## 🏆 Workshop Complete! Look What You Engineered in 90 Minutes

1. **Multi-Agent Architecture (`.github/agents/`):** Designed a single **Chronicle Orchestrator** coordinating least-privilege **Developer**, **Tester**, **Security**, and **Documentation** role subagents.
2. **Reusable Agent Skills (`.github/skills/`):** Authored 4 domain `SKILL.md` modules following the open Agent Skills specification and bound them to your specialist agents.
3. **Zero-Package End-to-End Engineering:** Added Entra ID Service Principal OAuth2, Microsoft Foundry LLM session handoff summarization (`<session-name>-summary.md`) with map-reduce chunking, a live progress dialog, a popup log viewer with clipboard copy, pure-Node PNG/ICO icon rendering, and a sandboxed Windows Electron + NSIS setup installer—with **zero runtime npm packages**!
