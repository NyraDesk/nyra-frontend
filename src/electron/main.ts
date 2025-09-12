import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import OAuthServer from './oauth-server';

let mainWindow: BrowserWindow | null = null;
let oauthServer: OAuthServer | null = null;

async function createWindow() {
  // Avvia OAuth server interno PRIMA di creare la finestra
  console.log('Starting OAuth server...');
  oauthServer = new OAuthServer();
  await oauthServer.start(3001);
  console.log('OAuth server started successfully');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    icon: path.join(__dirname, '../../assets/icon.png')
  });

  // In sviluppo carica da localhost
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In produzione carica il build
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  console.log('Stopping OAuth server...');
  if (oauthServer) {
    oauthServer.stop();
  }
});
