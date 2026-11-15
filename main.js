const { app, BrowserWindow, ipcMain, dialog, Menu, shell, screen } = require('electron');
const path = require('path');
const fs = require('fs');

// Ensure Chromium & Electron start maximized on Linux and Windows
app.commandLine.appendSwitch('start-maximized');

let mainWindow;

function getDatabasePath() {
  const userData = app.getPath('userData');
  return path.join(userData, 'lab_x_records.json');
}

function createWindow() {
  let initialWidth = 1280;
  let initialHeight = 720;
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    if (primaryDisplay && primaryDisplay.workAreaSize) {
      initialWidth = Math.min(1280, primaryDisplay.workAreaSize.width);
      initialHeight = Math.min(720, primaryDisplay.workAreaSize.height);
    }
  } catch (e) {
    // Fallback safe dimensions
  }

  mainWindow = new BrowserWindow({
    width: initialWidth,
    height: initialHeight,
    minWidth: 800,
    minHeight: 480,
    show: false,
    title: "Lab X — Diagnostic Studio",
    backgroundColor: '#080e1e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  mainWindow.maximize();

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
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
              message: 'Lab X Studio v1.1.3-beta (Testing - Firebase Cloud Sync)\nProfessional Diagnostic Studio & LIS\nDesigned for Krishna Computerized Laboratory.',
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

ipcMain.handle('open-external', async (event, url) => {
  try {
    if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:') || url.startsWith('tel:'))) {
      await shell.openExternal(url);
      return { success: true };
    }
    return { success: false, error: 'Invalid URL' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('launch-installer', async (event, filename) => {
  try {
    const downloadsPath = app.getPath('downloads');
    let installerPath = null;
    if (filename) {
      const directPath = path.join(downloadsPath, filename);
      if (fs.existsSync(directPath)) {
        installerPath = directPath;
      }
    }
    if (!installerPath && fs.existsSync(downloadsPath)) {
      const files = fs.readdirSync(downloadsPath);
      const matches = files
        .filter(f => (f.toLowerCase().includes('lab-x') || f.toLowerCase().includes('labx')) && (f.endsWith('.exe') || f.endsWith('.deb') || f.endsWith('.AppImage')))
        .map(f => {
          try {
            return {
              name: f,
              path: path.join(downloadsPath, f),
              time: fs.statSync(path.join(downloadsPath, f)).mtimeMs
            };
          } catch(e) {
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => b.time - a.time);

      if (matches.length > 0) {
        installerPath = matches[0].path;
      }
    }

    if (installerPath) {
      shell.openPath(installerPath);
      // Wait 1500ms to allow installer process to initialize, then exit cleanly
      setTimeout(() => {
        app.quit();
      }, 1500);
      return { success: true, path: installerPath };
    } else {
      if (fs.existsSync(downloadsPath)) {
        shell.openPath(downloadsPath);
      }
      return { success: false, error: 'Installer not found in Downloads. Opened folder.' };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-downloads', async () => {
  try {
    const downloadsPath = app.getPath('downloads');
    if (fs.existsSync(downloadsPath)) {
      shell.openPath(downloadsPath);
      return { success: true };
    }
    return { success: false, error: 'Downloads folder not found' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
