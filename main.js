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

function getBackupDirectory() {
  const userData = app.getPath('userData');
  const backupDir = path.join(userData, 'backups');
  if (!fs.existsSync(backupDir)) {
    try { fs.mkdirSync(backupDir, { recursive: true }); } catch (e) {}
  }
  return backupDir;
}

// Atomic & Safe write to disk (prevents corrupt JSON on power cut/crash)
function atomicWriteJson(filePath, data) {
  const tempPath = filePath + '.tmp.' + Date.now();
  const serialized = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  fs.writeFileSync(tempPath, serialized, 'utf8');
  fs.renameSync(tempPath, filePath);
}

// Create a daily snapshot backup and keep last 14 days
function createDailyBackupIfNeeded(records) {
  try {
    const backupDir = getBackupDirectory();
    const today = new Date().toISOString().slice(0, 10);
    const backupFile = path.join(backupDir, `lab_x_records_${today}.json`);
    if (!fs.existsSync(backupFile)) {
      atomicWriteJson(backupFile, records);
    }
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('lab_x_records_') && f.endsWith('.json'))
      .sort();
    while (files.length > 14) {
      const oldest = files.shift();
      try { fs.unlinkSync(path.join(backupDir, oldest)); } catch (e) {}
    }
  } catch (err) {
    console.warn('Backup creation notice:', err.message);
  }
}

// Safe reader with auto-recovery from backup if main file ever corrupts
function safeLoadRecords() {
  const dbPath = getDatabasePath();
  if (fs.existsSync(dbPath)) {
    try {
      const data = fs.readFileSync(dbPath, 'utf8');
      if (data && data.trim()) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (err) {
      console.error('Primary database corrupted! Attempting recovery from latest backup...', err);
      const backupDir = getBackupDirectory();
      if (fs.existsSync(backupDir)) {
        const backups = fs.readdirSync(backupDir)
          .filter(f => f.startsWith('lab_x_records_') && f.endsWith('.json'))
          .sort().reverse();
        for (const b of backups) {
          try {
            const bData = fs.readFileSync(path.join(backupDir, b), 'utf8');
            const bParsed = JSON.parse(bData);
            if (Array.isArray(bParsed) && bParsed.length > 0) {
              console.log(`Successfully recovered ${bParsed.length} records from backup ${b}`);
              atomicWriteJson(dbPath, bParsed);
              return bParsed;
            }
          } catch (e) {}
        }
      }
    }
  }
  return [];
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
ipcMain.handle('print-system', async () => {
  return new Promise((resolve) => {
    if (!mainWindow) return resolve({ success: false, errorType: 'no_window' });
    mainWindow.webContents.print({
      silent: false,
      printBackground: true
    }, (success, errorType) => {
      resolve({ success, errorType });
    });
  });
});

ipcMain.handle('print-silent', async (event, options = {}) => {
  return new Promise((resolve) => {
    if (!mainWindow) return resolve({ success: false, errorType: 'no_window' });
    mainWindow.webContents.print({
      silent: true,
      printBackground: true,
      ...options
    }, (success, errorType) => {
      resolve({ success, errorType });
    });
  });
});

ipcMain.handle('save-patient-record', async (event, rawRecord) => {
  try {
    const dbPath = getDatabasePath();
    const records = safeLoadRecords();

    // Ensure record has a persistent unique ID and timestamps
    const record = { ...rawRecord };
    const now = new Date().toISOString();
    if (!record.id) {
      record.id = record.labNo || `PID-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    }
    if (!record.createdAt) record.createdAt = now;
    record.updatedAt = now;

    // MATCH LOGIC: Match by unique ID or labNo; NEVER overwrite by bare name alone!
    const targetId = record.id;
    const targetLabNo = record.labNo ? String(record.labNo).trim().toLowerCase() : null;
    const targetMobile = record.mobile ? String(record.mobile).trim().replace(/[^0-9]/g, '') : null;
    const targetName = record.name ? String(record.name).trim().toLowerCase() : '';

    const idx = records.findIndex(r => {
      // 1. Direct ID match
      if (r.id && r.id === targetId) return true;
      // 2. Direct Lab Number match
      if (targetLabNo && r.labNo && String(r.labNo).trim().toLowerCase() === targetLabNo) return true;
      // 3. Name match ONLY IF mobile number is also identical (same patient returning)
      if (targetName && targetMobile && targetMobile.length >= 10) {
        const rMobile = r.mobile ? String(r.mobile).trim().replace(/[^0-9]/g, '') : '';
        const rName = r.name ? String(r.name).trim().toLowerCase() : '';
        if (rName === targetName && rMobile === targetMobile) return true;
      }
      return false;
    });

    if (idx >= 0) {
      records[idx] = { ...records[idx], ...record };
    } else {
      records.unshift(record);
    }

    // Atomic write to prevent file corruption
    atomicWriteJson(dbPath, records);

    // Create daily rolling backup
    createDailyBackupIfNeeded(records);

    return { success: true, count: records.length, recordId: record.id };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('load-patient-records', async () => {
  try {
    return safeLoadRecords();
  } catch (err) {
    return [];
  }
});

ipcMain.handle('export-pdf', async (event, options = {}) => {
  try {
    if (!mainWindow) return { success: false, error: 'No active window' };

    const patientName = (options.patientName || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_');
    const labNo = (options.labNo || 'Report').replace(/[^a-zA-Z0-9_-]/g, '_');
    const defaultFileName = `${patientName}_${labNo}.pdf`;

    let targetPath = options.customPath;
    if (!targetPath) {
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Diagnostic Report as PDF',
        defaultPath: path.join(app.getPath('downloads'), defaultFileName),
        filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
      });
      if (canceled || !filePath) return { success: false, canceled: true };
      targetPath = filePath;
    }

    // Generate high-resolution authentic A4 PDF
    const pdfBuffer = await mainWindow.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margins: {
        marginType: 'none'
      }
    });

    fs.writeFileSync(targetPath, pdfBuffer);

    // Reveal in explorer / folder
    try {
      shell.showItemInFolder(targetPath);
    } catch (e) {}

    return { success: true, filePath: targetPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('share-whatsapp', async (event, options = {}) => {
  try {
    const { phone, text, verifyUrl } = options;
    let cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
    
    let msg = text;
    if (!msg) {
      msg = `Hello, your Diagnostic Test Report from Krishna Computerized Laboratory has been prepared and verified.\n\n🔗 View Verified Electronic Report:\n${verifyUrl || ''}\n\nKrishna Computerized Laboratory`;
    }
    
    const encoded = encodeURIComponent(msg);
    const waUrl = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
      
    await shell.openExternal(waUrl);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
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
