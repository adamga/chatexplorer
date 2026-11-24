import { app, BrowserWindow, Menu, dialog, ipcMain, shell, session, utilityProcess } from 'electron';
import path from 'node:path';
import os from 'node:os';
import { mkdir, stat, copyFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
let mainWindow;
let backend;
let backendUrl;
let backendPort = 0;
let quitting = false;
let importSequence = 0;
const pendingImports = new Map();

const vscodeStorage = () => path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Code', 'User', 'workspaceStorage');
const copilotSessionState = () => path.join(os.homedir(), '.copilot', 'session-state');
const pathArguments = (argv) => argv.slice(app.isPackaged ? 1 : 2).filter((value) => value && !value.startsWith('-') && path.resolve(value) !== path.resolve(app.getAppPath()));

if (process.env.CHRONICLE_USER_DATA) app.setPath('userData', process.env.CHRONICLE_USER_DATA);
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', async (_event, argv) => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    const paths = pathArguments(argv);
    for (const input of paths) {
      const error = await importInBackend(input);
      if (error) dialog.showErrorBox('Could not open session', `${input}\n\n${error}`);
    }
    if (paths.length) mainWindow.webContents.reload();
  });
  app.whenReady().then(launch).catch((error) => {
    dialog.showErrorBox('Chronicle could not start', error.stack || error.message);
    app.quit();
  });
}

async function seedEnvIfMissing(dataDir) {
  if (process.env.CHRONICLE_USER_DATA) return;
  const targetEnv = path.join(dataDir, '.env');
  try { await stat(targetEnv); return; } catch { /* not present yet */ }
  const candidates = [
    process.env.CHRONICLE_ENV_FILE ? path.resolve(process.env.CHRONICLE_ENV_FILE) : null,
    path.join(process.cwd(), '.env'),
    path.join(path.dirname(process.execPath), '.env'),
    !app.isPackaged ? path.join(here, '..', '.env') : null
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const info = await stat(candidate);
      if (info.isFile()) {
        await copyFile(candidate, targetEnv, fsConstants.COPYFILE_EXCL);
        return;
      }
    } catch { /* try next */ }
  }
}

async function launch() {
  app.setAppUserModelId('com.chronicle.chatexplorer');
  const dataDir = app.getPath('userData');
  await mkdir(dataDir, { recursive: true });
  await seedEnvIfMissing(dataDir);
  await startBackend({ dataDir, loadSamples: !app.isPackaged, paths: pathArguments(process.argv) });

  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  ipcMain.handle('chronicle:pick', async (_event, kind, initialPath) => {
    const isAgent = kind === 'agent-folder' || kind === 'agent-file';
    let defaultPath = typeof initialPath === 'string' && path.isAbsolute(initialPath) ? initialPath
      : isAgent ? copilotSessionState() : vscodeStorage();
    try { await stat(defaultPath); } catch {
      const parentPath = path.dirname(defaultPath);
      try { await stat(parentPath); defaultPath = parentPath; } catch { defaultPath = os.homedir(); }
    }
    const isFile = kind === 'file' || kind === 'agent-file';
    const result = await dialog.showOpenDialog(mainWindow, isFile
      ? {
          title: isAgent ? 'Open an Agent Host / Copilot CLI session file' : 'Open a VS Code chat session file',
          defaultPath,
          properties: ['openFile'],
          filters: isAgent
            ? [{ name: 'Agent sessions (events.jsonl, workspace.yaml)', extensions: ['jsonl', 'yaml', 'yml'] }, { name: 'All files', extensions: ['*'] }]
            : [{ name: 'Chat sessions', extensions: ['jsonl', 'json', 'vscdb'] }, { name: 'All files', extensions: ['*'] }]
        }
      : {
          title: 'Select a session scan folder',
          defaultPath,
          properties: ['openDirectory']
        });
    return result.canceled ? null : result.filePaths[0];
  });

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: '&File', submenu: [
      { label: 'Scan locations…', accelerator: 'CmdOrCtrl+O', click: () => mainWindow?.webContents.send('chronicle:open', 'vscode') },
      { label: 'Scan Agent / CLI location…', accelerator: 'CmdOrCtrl+Shift+O', click: () => mainWindow?.webContents.send('chronicle:open', 'agent') },
      { type: 'separator' },
      { role: 'quit', label: 'Exit' }
    ] },
    { label: '&View', submenu: [
      { role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' },
      { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }
    ] },
    { label: '&Help', submenu: [
      { label: 'About Chronicle', click: () => dialog.showMessageBox(mainWindow, { type: 'info', title: 'About Chronicle', message: `Chronicle · Chat Explorer ${app.getVersion()}`, detail: 'A local, read-only explorer for persisted VS Code chat sessions.\nYour history never leaves this machine.' }) }
    ] }
  ]));
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1480, height: 960, minWidth: 900, minHeight: 600,
    title: 'Chronicle · Chat Explorer',
    backgroundColor: '#07100b',
    icon: path.join(here, '..', 'build', 'icon.png'),
    show: false,
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(here, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false }
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (backendUrl && url.startsWith(`${backendUrl}/log.html`)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 880, height: 660, minWidth: 520, minHeight: 380,
          title: 'Chronicle · Summary Operation Log',
          backgroundColor: '#101413',
          icon: path.join(here, '..', 'build', 'icon.png'),
          autoHideMenuBar: true,
          webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false }
        }
      };
    }
    if (/^https?:\/\//i.test(url) && !url.startsWith(backendUrl)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith(backendUrl)) return;
    event.preventDefault();
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
  });
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.loadURL(backendUrl);
}

function importInBackend(input) {
  return new Promise((resolve) => {
    const id = ++importSequence;
    pendingImports.set(id, resolve);
    backend.postMessage({ type: 'import', id, path: input });
  });
}
// Starts the server in a utility process and restarts it (keeping the same port) if it dies.
function startBackend(options) {
  return new Promise((resolve, reject) => {
    const child = utilityProcess.fork(path.join(here, 'backend.mjs'), [JSON.stringify({ ...options, port: backendPort })], {
      serviceName: 'Chronicle backend', stdio: 'pipe', execArgv: ['--max-old-space-size=8192']
    });
    let stderr = '';
    child.stderr?.on('data', (chunk) => { stderr = (stderr + chunk).slice(-4000); });
    child.stdout?.on('data', () => {});
    let started = false;
    child.on('message', (message) => {
      if (message.type === 'ready') {
        started = true;
        backend = child; backendPort = message.port; backendUrl = message.url;
        resolve();
      } else if (message.type === 'failed') reject(new Error(message.error));
      else if (message.type === 'imported') { pendingImports.get(message.id)?.(message.error); pendingImports.delete(message.id); }
    });
    child.on('exit', (code) => {
      for (const done of pendingImports.values()) done('The background reader stopped.');
      pendingImports.clear();
      if (!started) { reject(new Error(stderr.trim() || `Backend exited with code ${code}.`)); return; }
      if (quitting || backend !== child) return;
      console.error(`Backend exited (${code}); restarting.\n${stderr}`);
      startBackend({ ...options, paths: [] }).then(() => {
        mainWindow?.loadURL(backendUrl);
        mainWindow?.webContents.once('did-finish-load', () => mainWindow?.webContents.executeJavaScript("window.dispatchEvent(new CustomEvent('chronicle:recovered'))").catch(() => {}));
      }).catch((error) => dialog.showErrorBox('Chronicle stopped', error.message));
    });
  });
}

app.on('before-quit', () => { quitting = true; });
app.on('window-all-closed', () => {
  quitting = true;
  backend?.kill();
  app.quit();
});
