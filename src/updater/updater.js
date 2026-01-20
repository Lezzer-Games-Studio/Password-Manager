const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

function initAutoUpdater() {
  autoUpdater.logger = log;
  autoUpdater.logger.transports.file.level = 'info';

  autoUpdater.autoDownload = true;

  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);
  });

  autoUpdater.on('update-not-available', () => {
    log.info('No updates available');
  });

  autoUpdater.on('error', (err) => {
    log.error('Update error:', err);
  });

  autoUpdater.on('update-downloaded', () => {
    log.info('Update downloaded');
    autoUpdater.quitAndInstall();
  });
}

module.exports = { initAutoUpdater };
