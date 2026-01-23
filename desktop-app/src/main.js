const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { initDatabase } = require('./database/init-sqljs');
const authHandlers = require('./api/auth');
const productHandlers = require('./api/products');
const customerHandlers = require('./api/customers');
const salesHandlers = require('./api/sales');
const expenseHandlers = require('./api/expenses');
const reportHandlers = require('./api/reports');
const settingsHandlers = require('./api/settings');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../build/icon.png'),
    title: 'Ibrahimi Store Management System'
  });

  // Load the login page initially
  mainWindow.loadFile(path.join(__dirname, '../renderer/login.html'));

  // Open DevTools to see errors
  mainWindow.webContents.openDevTools();

  // Log when page loads
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Page loaded successfully');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('❌ Page failed to load:', errorCode, errorDescription);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Initialize SQLite database
  await initDatabase();
  
  // Register all IPC handlers
  authHandlers.register(ipcMain);
  productHandlers.register(ipcMain);
  customerHandlers.register(ipcMain);
  salesHandlers.register(ipcMain);
  expenseHandlers.register(ipcMain);
  reportHandlers.register(ipcMain);
  settingsHandlers.register(ipcMain);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
