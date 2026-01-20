const { ipcMain } = require('electron');
const passwordRepo = require('../storage/passwordRepo');
const generator = require('../core/passwordGenerator');
const { startAutoLock, resetAutoLock } = require('../core/autoLock');
let isUnlocked = true;
const clipboard = require('../utils/clipboard');



ipcMain.handle('password:copy', async (_, id) => {
  const pwd = await passwordRepo.getById(id);
  clipboard.copyWithTimeout(pwd.password);
});


ipcMain.handle('password:save', async (_, data) => {
  return passwordRepo.save(data);
});

ipcMain.handle('password:get', async () => {
  return passwordRepo.getAll();
});

ipcMain.handle('password:generate', (_, options) => {
  return generator.generate(options);
});


ipcMain.handle('vault:unlock', () => {
  isUnlocked = true;
  startAutoLock(2 * 60 * 1000, lockVault); // 2 хв
});

ipcMain.handle('vault:activity', () => {
  if (isUnlocked) {
    resetAutoLock(2 * 60 * 1000, lockVault);
  }
});

function lockVault() {
  isUnlocked = false;
  BrowserWindow.getAllWindows()[0].webContents.send('vault:lock');
}


