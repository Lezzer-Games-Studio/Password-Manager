const { contextBridge, ipcRenderer } = require('electron');
copyPassword: (id) => ipcRenderer.invoke('password:copy', id),


contextBridge.exposeInMainWorld('api', {
  savePassword: (data) => ipcRenderer.invoke('password:save', data),
  getPasswords: () => ipcRenderer.invoke('password:get'),
  generatePassword: (options) =>
    ipcRenderer.invoke('password:generate', options),
});


contextBridge.exposeInMainWorld('api', {
  vaultActivity: () => ipcRenderer.send('vault:activity'),
  unlockVault: () => ipcRenderer.invoke('vault:unlock'),
});

contextBridge.exposeInMainWorld('api', {
  getPasswords: () => ipcRenderer.invoke('password:get'),
  savePassword: (data) => ipcRenderer.invoke('password:save', data),
});