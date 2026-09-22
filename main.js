const { app, BrowserWindow, ipcMain, dialog, shell, session } = require('electron');
const { pathToFileURL } = require('url');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { WorkshopDB } = require('./db');

const APP_NAME = 'Workshop Manager';
const dataDir = () => path.join(app.getPath('appData'), 'Workshop Manager', 'Data');
const backupDir = () => path.join(app.getPath('documents'), 'Workshop Manager Backups');
const invoiceDir = () => path.join(app.getPath('documents'), 'Workshop Manager', 'فاکتورها');
const attachmentRoot = () => path.join(dataDir(), 'Attachments');
let db;
let win;
let lastBackupDay = '';

function ensureDirs() {
  fs.mkdirSync(dataDir(), { recursive: true });
  fs.mkdirSync(backupDir(), { recursive: true });
  fs.mkdirSync(invoiceDir(), { recursive: true });
  fs.mkdirSync(attachmentRoot(), { recursive: true });
}

function stamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

function copyFileAtomic(src, dest) {
  const tmp = dest + '.tmp';
  fs.copyFileSync(src, tmp);
  fs.renameSync(tmp, dest);
}

function backupNow(reason='manual') {
  ensureDirs();
  db.flush();
  const base = path.join(backupDir(), `WorkshopManager_${stamp()}_${reason}`);
  copyFileAtomic(db.dbPath, base + '.sqlite');
  const json = db.exportJson();
  fs.writeFileSync(base + '.json', JSON.stringify(json, null, 2), 'utf8');
  const attachments = attachmentRoot();
  const backupAttachments = base + '_attachments';
  if (fs.existsSync(attachments)) fs.cpSync(attachments, backupAttachments, { recursive: true });
  return { ok: true, path: base, backupDir: backupDir(), attachments: backupAttachments };
}

function cleanupBackups() {
  ensureDirs();
  const files = fs.readdirSync(backupDir()).filter(x => x.endsWith('.sqlite') || x.endsWith('.json')).sort();
  // Keep at least 60 recent files (30 backup pairs) and remove older files only when there are many.
  if (files.length > 120) {
    for (const f of files.slice(0, files.length - 120)) {
      try { fs.unlinkSync(path.join(backupDir(), f)); } catch {}
    }
  }
}

function scheduledBackupCheck() {
  const now = new Date();
  const dayKey = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
  // Daily backup at/after 23:55 while the application is running.
  if ((now.getHours() > 23 || (now.getHours() === 23 && now.getMinutes() >= 55)) && lastBackupDay !== dayKey) {
    try { backupNow('daily'); lastBackupDay = dayKey; cleanupBackups(); } catch (e) { console.error('Daily backup failed', e); }
  }
  // Extra Thursday 17:00 backup.
  if (now.getDay() === 4 && now.getHours() === 17 && now.getMinutes() >= 0 && now.getMinutes() < 2) {
    const key = dayKey + '-thu';
    if (lastBackupDay !== key) {
      try { backupNow('weekly-thursday'); lastBackupDay = key; cleanupBackups(); } catch (e) { console.error('Weekly backup failed', e); }
    }
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#081323',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  win.removeMenu();
  win.loadFile(path.join(__dirname, 'index.html'));
  win.webContents.on('did-finish-load', () => {
    // The renderer is responsible for providing a complete snapshot if the scheduled backup fires.
  });
}


function safeName(v, fallback='file') {
  const s = String(v || fallback).replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
  return s || fallback;
}
function cardFolder(cardNo) {
  return path.join(attachmentRoot(), `Kartax_${safeName(cardNo, 'unknown')}`);
}
function mediaFilePath(cardNo, diskName) {
  return path.join(cardFolder(cardNo), safeName(diskName, 'file'));
}
function fileUrl(p) { return pathToFileURL(p).href; }
function ffmpegPath() {
  try { return require('ffmpeg-static'); } catch { return null; }
}
function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const bin = ffmpegPath();
    if (!bin) return reject(new Error('FFmpeg در نسخه ویندوز نصب/بسته‌بندی نشده است.'));
    const p = spawn(bin, args, { windowsHide: true });
    let err = '';
    p.stderr.on('data', d => { err += d.toString(); });
    p.on('error', reject);
    p.on('close', code => code === 0 ? resolve() : reject(new Error(err.slice(-3000) || `ffmpeg exit ${code}`)));
  });
}
async function transcodeForPreview(src, dest) {
  if (fs.existsSync(dest)) return dest;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  await runFfmpeg(['-y','-i',src,'-c:v','libx264','-preset','veryfast','-crf','23','-c:a','aac','-b:a','128k','-movflags','+faststart',dest]);
  return dest;
}
const browserVideoExts = new Set(['mp4','webm','ogg','ogv','m4v']);
async function nativePreviewUrl(cardNo, diskName, kind) {
  const src = mediaFilePath(cardNo, diskName);
  if (!fs.existsSync(src)) throw new Error('فایل پیدا نشد.');
  if (kind !== 'video') return fileUrl(src);
  const ext = path.extname(src).slice(1).toLowerCase();
  if (browserVideoExts.has(ext)) return fileUrl(src);
  const preview = path.join(path.dirname(src), `${safeName(diskName)}.__preview.mp4`);
  await transcodeForPreview(src, preview);
  return fileUrl(preview);
}

function setupIPC() {
  ipcMain.on('db:load-state', e => {
    try { e.returnValue = JSON.stringify(db.loadState() || null); } catch { e.returnValue = null; }
  });
  ipcMain.handle('db:save-state', async (_e, state) => { db.saveState(state); return { ok: true }; });
  ipcMain.handle('db:save-factor-invoices', async (_e, invoices) => { db.saveFactorInvoices(invoices || []); return { ok: true }; });
  ipcMain.handle('db:clear-factor-invoices', async () => { db.clearFactorInvoices(); return { ok: true }; });
  ipcMain.handle('backup:now', async () => backupNow('manual'));
  ipcMain.handle('backup:info', async () => ({ dir: backupDir(), db: db.dbPath }));
  ipcMain.handle('backup:renderer-snapshot', async (_e, payload) => {
    if (payload?.state) db.saveState(payload.state);
    if (Array.isArray(payload?.invoices)) db.saveFactorInvoices(payload.invoices);
    return backupNow(payload?.reason || 'scheduled');
  });

  ipcMain.handle('media:save', async (_e, payload) => {
    const id = safeName(payload?.id, Date.now());
    const cardNo = safeName(payload?.cardNo, 'unknown');
    const originalName = safeName(payload?.name, 'file');
    const diskName = `${id}__${originalName}`;
    const dir = cardFolder(cardNo);
    fs.mkdirSync(dir, { recursive: true });
    const target = path.join(dir, diskName);
    const bytes = Buffer.from(payload?.data || []);
    fs.writeFileSync(target, bytes);
    return { ok: true, diskName, path: target, url: fileUrl(target), folder: dir };
  });
  ipcMain.handle('media:delete', async (_e, payload) => {
    const target = mediaFilePath(payload?.cardNo, payload?.diskName);
    try { if (fs.existsSync(target)) fs.unlinkSync(target); } catch {}
    const preview = target + '.__preview.mp4';
    try { if (fs.existsSync(preview)) fs.unlinkSync(preview); } catch {}
    return { ok: true };
  });
  ipcMain.handle('media:get-url', async (_e, payload) => {
    const target = mediaFilePath(payload?.cardNo, payload?.diskName);
    if (!fs.existsSync(target)) throw new Error('فایل پیدا نشد.');
    return { ok: true, url: fileUrl(target) };
  });
  ipcMain.handle('media:get-preview-url', async (_e, payload) => {
    const url = await nativePreviewUrl(payload?.cardNo, payload?.diskName, payload?.kind);
    return { ok: true, url };
  });
  ipcMain.handle('media:open-folder', async (_e, payload) => {
    const dir = cardFolder(payload?.cardNo);
    fs.mkdirSync(dir, { recursive: true });
    await shell.openPath(dir);
    return { ok: true, path: dir };
  });
  ipcMain.handle('media:open-file', async (_e, payload) => {
    const target = mediaFilePath(payload?.cardNo, payload?.diskName);
    if (!fs.existsSync(target)) throw new Error('فایل پیدا نشد.');
    const result = await shell.openPath(target);
    return { ok: !result, error: result || '' };
  });

  ipcMain.handle('invoices:choose-root', async () => {
    const result = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'] });
    if (result.canceled || !result.filePaths[0]) return { ok: false, canceled: true };
    const root = path.join(result.filePaths[0], 'فاکتورها');
    fs.mkdirSync(root, { recursive: true });
    return { ok: true, path: root };
  });
  ipcMain.handle('invoices:get-root', async () => ({ ok: true, path: invoiceDir() }));
  ipcMain.handle('invoices:save-all', async (_e, invoices) => {
    const root = invoiceDir();
    let count = 0;
    for (const x of invoices || []) {
      const date = String(x.date || 'بدون-تاریخ').replace(/\//g, '-');
      const dir = path.join(root, date);
      fs.mkdirSync(dir, { recursive: true });
      const no = String(x.invoiceNo || x.id).replace(/[\\/:*?"<>|]/g, '-');
      fs.writeFileSync(path.join(dir, `فاکتور-${no}.json`), JSON.stringify(x, null, 2), 'utf8');
      count++;
    }
    return { ok: true, count, path: root };
  });
  ipcMain.handle('invoices:save-bundle', async (_e, { invoice, pngDataUrl, svg }) => {
    const date = String(invoice?.date || 'بدون-تاریخ').replace(/\//g, '-');
    const dir = path.join(invoiceDir(), date);
    fs.mkdirSync(dir, { recursive: true });
    const no = String(invoice?.invoiceNo || invoice?.id || Date.now()).replace(/[\\/:*?"<>|]/g, '-');
    fs.writeFileSync(path.join(dir, `فاکتور-${no}.json`), JSON.stringify(invoice, null, 2), 'utf8');
    if (svg) fs.writeFileSync(path.join(dir, `فاکتور-${no}.svg`), svg, 'utf8');
    if (pngDataUrl) {
      const base64 = String(pngDataUrl).replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(path.join(dir, `فاکتور-${no}.png`), Buffer.from(base64, 'base64'));
    }
    return { ok: true, path: dir };
  });
}

app.whenReady().then(async () => {
  app.setAppUserModelId('ir.workshopmanager.pro');
  ensureDirs();
  db = new WorkshopDB(path.join(dataDir(), 'workshop.sqlite'));
  await db.init();
  setupIPC();
  createWindow();
  setInterval(scheduledBackupCheck, 60 * 1000);
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}).catch(err => { console.error(err); app.quit(); });

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { try { db?.flush(); } catch {} });
