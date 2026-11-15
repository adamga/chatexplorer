const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chronicleDesktop', {
  pick: (kind) => ipcRenderer.invoke('chronicle:pick', kind === 'file' ? 'file' : 'folder'),
  onOpen: (callback) => ipcRenderer.on('chronicle:open', () => callback())
});
