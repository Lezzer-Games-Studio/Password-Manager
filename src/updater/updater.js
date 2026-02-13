const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const { app, dialog, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');

function initAutoUpdater() {
  if (!app.isPackaged) {
    log.info('🧪 Режим розробки: автооновлення вимкнено');
    return;
  }

  autoUpdater.logger = log;
  autoUpdater.logger.transports.file.level = 'info';
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false; // ← ВИМКНУТИ АВТОМАТИЧНИЙ ПЕРЕЗАПУСК

  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('checking-for-update', () => {
    log.info('Перевіряю наявність оновлень...');
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Доступне оновлення:', info.version);
    
    dialog.showMessageBox({
      type: 'info',
      title: 'Доступне оновлення',
      message: `Доступна нова версія ${info.version}`,
      detail: 'Оновлення завантажується автоматично. Після завантаження вам потрібно буде вручну запустити інсталятор.',
      buttons: ['OK']
    });
  });

  autoUpdater.on('update-not-available', () => {
    log.info('Оновлень не знайдено');
  });

  autoUpdater.on('error', (err) => {
    log.error('Помилка оновлення:', err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    log.info(`Завантаження: ${progressObj.percent.toFixed(2)}%`);
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Оновлення завантажено');
    
    // Користувацький діалог з опціями
    showUpdateDialog(info);
  });
}

function showUpdateDialog(info) {
  const { response } = dialog.showMessageBoxSync({
    type: 'info',
    title: 'Оновлення готове',
    message: `Версія ${info.version} завантажена!`,
    detail: 'Оскільки інсталятор не підписаний, потрібно вручну запустити файл оновлення.',
    buttons: ['Пізніше', 'Відкрити папку з інсталятором', 'Спробувати встановити'],
    defaultId: 1,
    cancelId: 0
  });

  if (response === 1) {
    // Відкриваємо папку з інсталятором
    const updateDir = path.join(app.getPath('temp'), 'password-manager-updater');
    
    // Шукаємо файл інсталятора
    fs.readdir(updateDir, (err, files) => {
      if (err) {
        log.error('Помилка читання папки:', err);
        return;
      }
      
      const installer = files.find(f => f.includes('Password-Manager-Setup'));
      if (installer) {
        const installerPath = path.join(updateDir, installer);
        shell.showItemInFolder(installerPath);
        
        // Додаткове повідомлення
        dialog.showMessageBox({
          type: 'info',
          title: 'Інструкція',
          message: 'Файл інсталятора знаходиться у відкритій папці',
          detail: '1. Клацніть правою кнопкою на файлі\n2. Оберіть "Запустити від імені адміністратора"\n3. Дотримуйтесь інструкцій інсталятора',
          buttons: ['OK']
        });
      }
    });
    
  } else if (response === 2) {
    // Спробувати автоматичне встановлення (може не спрацювати через підпис)
    try {
      autoUpdater.quitAndInstall();
    } catch (error) {
      log.error('Помилка автоматичного встановлення:', error);
      
      dialog.showMessageBox({
        type: 'error',
        title: 'Помилка встановлення',
        message: 'Не вдалося встановити оновлення автоматично',
        detail: 'Будь ласка, запустіть інсталятор вручну з папки тимчасових файлів.',
        buttons: ['OK']
      });
    }
  }
}

// Функція для ручної перевірки (викликати з UI)
function checkForUpdatesManually() {
  if (!app.isPackaged) {
    dialog.showMessageBox({
      type: 'info',
      title: 'Режим розробки',
      message: 'Автооновлення працює тільки в зібраній версії програми.',
      buttons: ['OK']
    });
    return;
  }
  
  autoUpdater.checkForUpdates();
}

module.exports = { initAutoUpdater, checkForUpdatesManually };