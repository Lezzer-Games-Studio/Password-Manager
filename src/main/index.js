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



const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { initAutoUpdater } = require('../updater/updater');
require('./ipc'); 

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      // ПЕРЕКОНАЙСЯ, ЩО ШЛЯХ ДО ПРЕЛОАДА ПРАВИЛЬНИЙ
      preload: path.join(__dirname, '../preload/api.js'), 
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Коли вікно готове — запускаємо оновлювач
  mainWindow.webContents.on('did-finish-load', () => {
    initAutoUpdater(mainWindow);
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

Menu.setApplicationMenu(null);