const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  printSilent: (options) => ipcRenderer.invoke('print-silent', options),
  savePatientRecord: (record) => ipcRenderer.invoke('save-patient-record', record),
  loadPatientRecords: () => ipcRenderer.invoke('load-patient-records'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  onTriggerSave: (callback) => ipcRenderer.on('trigger-save', callback)
});
