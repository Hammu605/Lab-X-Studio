const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function getDatabasePath() {
  const userData = app.getPath('userData');
  return path.join(userData, 'lab_x_records.json');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "Lab X — Diagnostic Studio",
    backgroundColor: '#080e1e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.loadFile('index.html');

  // Build Desktop Menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Print Report (Ctrl+P)',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            mainWindow.webContents.print({ silent: false, printBackground: true });
          }
        },
        {
          label: 'Silent Quick Print',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => {
            mainWindow.webContents.print({ silent: true, printBackground: true });
          }
        },
        {
          label: 'Save Patient (Ctrl+S)',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('trigger-save');
          }
        },
        { type: 'separator' },
        { role: 'quit', label: 'Exit Lab X' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Lab X',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Lab X Studio',
              message: 'Lab X Studio v1.0\nProfessional Diagnostic Studio & LIS\nDesigned for Krishna Computerized Laboratory.',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('print-silent', async (event, options = {}) => {
  return new Promise((resolve) => {
    mainWindow.webContents.print({
      silent: true,
      printBackground: true,
      ...options
    }, (success, errorType) => {
      resolve({ success, errorType });
    });
  });
});

ipcMain.handle('save-patient-record', async (event, record) => {
  try {
    const dbPath = getDatabasePath();
    let records = [];
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf8');
      if (data) records = JSON.parse(data);
    }
    const idx = records.findIndex(r => r.name.toLowerCase() === record.name.toLowerCase());
    if (idx >= 0) {
      records[idx] = record;
    } else {
      records.unshift(record);
    }
    fs.writeFileSync(dbPath, JSON.stringify(records, null, 2), 'utf8');
    return { success: true, count: records.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('load-patient-records', async () => {
  try {
    const dbPath = getDatabasePath();
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf8');
      return JSON.parse(data || '[]');
    }
    return [];
  } catch (err) {
    return [];
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
