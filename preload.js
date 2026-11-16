const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  printReport: () => ipcRenderer.invoke('print-system'),
  printSilent: (options) => ipcRenderer.invoke('print-silent', options),
  savePatientRecord: (record) => ipcRenderer.invoke('save-patient-record', record),
  loadPatientRecords: () => ipcRenderer.invoke('load-patient-records'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  launchInstaller: (filename) => ipcRenderer.invoke('launch-installer', filename),
  openDownloads: () => ipcRenderer.invoke('open-downloads'),
  onTriggerSave: (callback) => ipcRenderer.on('trigger-save', callback)
});

