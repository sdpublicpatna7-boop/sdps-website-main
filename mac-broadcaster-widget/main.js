const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 720,
    resizable: true,
    minWidth: 380,
    minHeight: 600,
    maxWidth: 550,
    maxHeight: 900,
    frame: false,
    transparent: true,
    alwaysOnTop: false,
    titleBarStyle: 'hiddenInset',
    vibrancy: 'sidebar',
    visualEffectState: 'active',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false // Allows direct CORS requests to local LAN Broadcaster IP without proxy!
    },
    icon: path.join(__dirname, 'icon.png')
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
