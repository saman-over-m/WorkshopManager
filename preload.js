const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktopInfo', {
  isElectron: true,
  loadStateSync: () => ipcRenderer.sendSync('load-state-sync'),
  saveState: (state) => ipcRenderer.invoke('save-state', state),
  backupNow: () => ipcRenderer.invoke('backup-now'),
  openBackupFolder: () => ipcRenderer.invoke('open-backup-folder'),
  openDataFolder: () => ipcRenderer.invoke('open-data-folder'),
  getPaths: () => ipcRenderer.invoke('get-paths'),
  restoreBackup: () => ipcRenderer.invoke('restore-backup-dialog'),
  saveFactorInvoices: (items) => ipcRenderer.invoke('save-factor-invoices', items),
  getFactorInvoices: () => ipcRenderer.invoke('get-factor-invoices'),
  clearFactorInvoices: () => ipcRenderer.invoke('clear-factor-invoices'),
  invoices: {
    chooseRoot: () => ipcRenderer.invoke('invoices-choose-root'),
    getRoot: () => ipcRenderer.invoke('invoices-get-root'),
    saveAll: (items) => ipcRenderer.invoke('invoices-save-all', items),
    saveBundle: (x, png, svg) => ipcRenderer.invoke('invoices-save-bundle', x, png, svg)
  }
});
