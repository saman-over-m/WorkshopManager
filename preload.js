const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopInfo', {
  isElectron: true,
  platform: process.platform,
  version: process.versions.electron,
  loadStateSync: () => {
    try { return ipcRenderer.sendSync('db:load-state'); } catch { return null; }
  },
  saveState: state => ipcRenderer.invoke('db:save-state', state),
  saveFactorInvoices: invoices => ipcRenderer.invoke('db:save-factor-invoices', invoices),
  clearFactorInvoices: () => ipcRenderer.invoke('db:clear-factor-invoices'),
  backupNow: () => ipcRenderer.invoke('backup:now'),
  getBackupInfo: () => ipcRenderer.invoke('backup:info'),
  requestBackup: callback => {
    const fn = () => { try { callback?.(); } catch {} };
    ipcRenderer.on('backup:request-renderer-snapshot', fn);
    return () => ipcRenderer.removeListener('backup:request-renderer-snapshot', fn);
  },
  submitBackupSnapshot: payload => ipcRenderer.invoke('backup:renderer-snapshot', payload),

  media: {
    save: (payload) => ipcRenderer.invoke('media:save', payload),
    delete: (payload) => ipcRenderer.invoke('media:delete', payload),
    getUrl: (payload) => ipcRenderer.invoke('media:get-url', payload),
    getPreviewUrl: (payload) => ipcRenderer.invoke('media:get-preview-url', payload),
    openFolder: (payload) => ipcRenderer.invoke('media:open-folder', payload),
    openFile: (payload) => ipcRenderer.invoke('media:open-file', payload)
  },
  invoices: {
    chooseRoot: () => ipcRenderer.invoke('invoices:choose-root'),
    getRoot: () => ipcRenderer.invoke('invoices:get-root'),
    saveAll: invoices => ipcRenderer.invoke('invoices:save-all', invoices),
    saveBundle: (invoice, pngDataUrl, svg) => ipcRenderer.invoke('invoices:save-bundle', { invoice, pngDataUrl, svg })
  }
});
