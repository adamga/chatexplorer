const { contextBridge, ipcRenderer } = require('electron');
const allowedKinds = new Set(['folder', 'file', 'agent-folder', 'agent-file']);

contextBridge.exposeInMainWorld('chronicleDesktop', {
  pick: (kind, initialPath) => ipcRenderer.invoke('chronicle:pick', allowedKinds.has(kind) ? kind : 'folder',
    typeof initialPath === 'string' ? initialPath : undefined),
  onOpen: (callback) => ipcRenderer.on('chronicle:open', (_event, source) => callback(source))
});
