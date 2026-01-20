const { autoUpdater } = require('electron-updater');
const { ipcMain } = require('electron');

// Налаштування для приватного репозиторію
autoUpdater.requestHeaders = {
  "Authorization": "token ВАШ_ТОКЕН_ГІТХАБУ" 
};
autoUpdater.autoDownload = true; // Автоматично качати, коли знайдено

function initAutoUpdater(mainWindow) {
  // Перевірка оновлень
  autoUpdater.checkForUpdatesAndNotify();

  // Коли знайдено нову версію
  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update_available', info.version);
  });

  // Коли файл завантажено
  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update_downloaded');
  });

  // Слухаємо команду на перезапуск
  ipcMain.on('restart_app', () => {
    autoUpdater.quitAndInstall();
  });
}

module.exports = { initAutoUpdater };