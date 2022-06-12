const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    openExplorer: (path) => ipcRenderer.send('open-exp', {path})
})