const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Esponi solo le API necessarie e sicure
  getVersion: () => process.versions.electron,
  platform: process.platform,
  
  // Comunicazione sicura con il main process
  send: (channel, data) => {
    const validChannels = ['app-quit', 'minimize', 'maximize'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  
  receive: (channel, func) => {
    const validChannels = ['app-update'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  }
});
