// const { app, BrowserWindow, Menu } = require('electron');
// const path = require('path');
// const { initAutoUpdater } = require('../updater/updater');
// require('./ipc'); // твій IPC

// let mainWindow;

// function createWindow() {
//   mainWindow = new BrowserWindow({
//     width: 900,
//     height: 600,
//     webPreferences: {
//       preload: path.join(__dirname, '../preload/api.js'), // твій preload
//       contextIsolation: true,
//       nodeIntegration: false,
//     },
//   });

//   // Підключаємо твій UI
//   mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

//   // Відкриваємо DevTools для розробки
//   mainWindow.webContents.openDevTools();

//   mainWindow.on('closed', function () {
//     mainWindow = null;
//   });
// }

// // Коли Electron готовий — створюємо вікно
// app.whenReady().then(() => {
//   createWindow();
//   initAutoUpdater(); // автооновлення
// });

// // Закриваємо програму, якщо всі вікна закриті
// app.on('window-all-closed', function () {
//   if (process.platform !== 'darwin') app.quit();
// });

// app.on('activate', function () {
//   if (BrowserWindow.getAllWindows().length === 0) createWindow();
// });
// Menu.setApplicationMenu(null);



// const { app, BrowserWindow, Menu, Notification } = require('electron');
// const path = require('path');
// const { initAutoUpdater } = require('../updater/updater');
// require('./ipc'); 
const { app, BrowserWindow, Menu, Notification } = require('electron'); // Всі модулі в одному рядку
const path = require('path');
const { initAutoUpdater } = require('../updater/updater');
require('./ipc');
let mainWindow;

// ВАЖЛИВО: Вкажіть ID вашого додатка для Windows (для сповіщень)
// В main.js
if (process.platform === 'win32') {
    app.setAppUserModelId("Vaultsafe"); 
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100, 
    height: 750,
    minWidth: 900,
    minHeight: 600,
    center: true,
    show: false, 
    webPreferences: {
      preload: path.join(__dirname, '../preload/api.js'), 
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false, 
    },
  });

  // Прибираємо меню
  mainWindow.setMenuBarVisibility(false); 
  Menu.setApplicationMenu(null);

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Показуємо вікно, коли воно готове
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.webContents.openDevTools(); // Розкоментуй, якщо потрібна консоль
  });

  // Ініціалізація оновлень
  mainWindow.webContents.on('did-finish-load', () => {
    initAutoUpdater(mainWindow);
  });

  // ЛОГІКА ЗГОРТАННЯ В ТРЕЙ (замість повного закриття)
  mainWindow.on('close', function (event) {
    if (!app.isQuiting) {
        event.preventDefault();
        mainWindow.hide(); 
    }
    return false;
  });

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
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});