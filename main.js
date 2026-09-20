const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(app.getPath('appData'), 'Workshop Manager', 'Data');
const BACKUP_DIR = path.join(app.getPath('documents'), 'Workshop Manager Backups');
const DB_PATH = path.join(DATA_DIR, 'workshop.sqlite');
const INVOICES_DIR = path.join(app.getPath('documents'), 'Workshop Manager', 'فاکتورها');

let db;
let mainWindow;

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.mkdirSync(INVOICES_DIR, { recursive: true });
}
function openDb() {
  if (db) return db;
  ensureDirs();
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL, updated_at TEXT NOT NULL);\nCREATE TABLE IF NOT EXISTS factor_invoices (id TEXT PRIMARY KEY, json TEXT NOT NULL, updated_at TEXT NOT NULL);\nCREATE TABLE IF NOT EXISTS backups (id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT NOT NULL, created_at TEXT NOT NULL);`);
  return db;
}
function defaultState() {
  return { cards: [], suppliers: [], customers: [], mechanics: [], garagePurchases: [], tips: [], seq: 1001, settings: { shop: 'تعمیرگاه من', logo: '', currencyDisplay: 'toman' } };
}
function loadState() {
  const row = openDb().prepare('SELECT json FROM app_state WHERE id=1').get();
  if (!row) return defaultState();
  try { return JSON.parse(row.json); } catch { return defaultState(); }
}
function saveState(state) {
  const now = new Date().toISOString();
  openDb().prepare(`INSERT INTO app_state(id,json,updated_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json, updated_at=excluded.updated_at`).run(JSON.stringify(state), now);
  return true;
}
function listFactorInvoices() {
  return openDb().prepare('SELECT json FROM factor_invoices ORDER BY updated_at DESC').all().map(r => JSON.parse(r.json));
}
function saveFactorInvoices(items) {
  const tx = openDb().transaction((arr) => {
    for (const x of arr || []) {
      if (!x?.id) continue;
      openDb().prepare(`INSERT INTO factor_invoices(id,json,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json, updated_at=excluded.updated_at`).run(x.id, JSON.stringify(x), new Date().toISOString());
    }
  });
  tx(items || []);
  return listFactorInvoices();
}
function clearFactorInvoices() { openDb().prepare('DELETE FROM factor_invoices').run(); }
function saveInvoiceBundle(x, pngDataUrl, svgText) {
  const date = String(x?.date || 'unknown').replace(/[^0-9/]/g, '').replaceAll('/', '-');
  const dir = path.join(INVOICES_DIR, date || 'unknown');
  fs.mkdirSync(dir, { recursive: true });
  const no = String(x?.invoiceNo || x?.id || Date.now()).replace(/[\\/:*?"<>|]/g, '-');
  const base = path.join(dir, `فاکتور-${no}`);
  fs.writeFileSync(`${base}.json`, JSON.stringify(x, null, 2), 'utf8');
  if (svgText) fs.writeFileSync(`${base}.svg`, svgText, 'utf8');
  if (pngDataUrl?.startsWith('data:image/')) fs.writeFileSync(`${base}.png`, Buffer.from(pngDataUrl.split(',')[1], 'base64'));
  return { ok: true, dir, base };
}
function createBackup() {
  ensureDirs();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(BACKUP_DIR, `WorkshopManager-${stamp}.sqlite`);
  const d = openDb();
  d.pragma('wal_checkpoint(TRUNCATE)');
  const safeTarget=target.replaceAll("'","''"); d.exec(`VACUUM INTO '${safeTarget}'`);
  d.prepare('INSERT INTO backups(path,created_at) VALUES(?,?)').run(target, new Date().toISOString());
  return { ok: true, path: target };
}
function restoreBackup(filePath) {
  if (!filePath || !fs.existsSync(filePath)) throw new Error('Backup file not found');
  if (db) { db.close(); db = null; }
  ensureDirs();
  fs.copyFileSync(filePath, DB_PATH);
  openDb();
  return loadState();
}
function registerScheduledBackups() {
  if (process.platform !== 'win32' || !app.isPackaged) return;
  try {
    const exe = process.execPath;
    execFileSync('schtasks.exe', ['/Create','/F','/SC','DAILY','/ST','23:55','/TN','Workshop Manager\Daily Backup','/TR',`"${exe}" --backup-now`], { windowsHide:true });
    execFileSync('schtasks.exe', ['/Create','/F','/SC','WEEKLY','/D','THU','/ST','17:00','/TN','Workshop Manager\Thursday Backup','/TR',`"${exe}" --backup-now`], { windowsHide:true });
  } catch (e) { console.warn('Could not register scheduled backups:', e.message); }
}

function makeWindow() {
  mainWindow = new BrowserWindow({ width: 1440, height: 900, minWidth: 1100, minHeight: 700, backgroundColor: '#07111f', webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false } });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.on('closed', () => { mainWindow = null; });
}

ipcMain.on('load-state-sync', (event) => { try { event.returnValue = JSON.stringify(loadState()); } catch { event.returnValue = JSON.stringify(defaultState()); } });
ipcMain.handle('save-state', (_, state) => saveState(state));
ipcMain.handle('backup-now', () => createBackup());
ipcMain.handle('open-backup-folder', () => { ensureDirs(); shell.openPath(BACKUP_DIR); return { ok: true, path: BACKUP_DIR }; });
ipcMain.handle('open-data-folder', () => { ensureDirs(); shell.openPath(DATA_DIR); return { ok: true, path: DATA_DIR }; });
ipcMain.handle('get-paths', () => ({ db: DB_PATH, backups: BACKUP_DIR, invoices: INVOICES_DIR }));
ipcMain.handle('save-factor-invoices', (_, items) => saveFactorInvoices(items));
ipcMain.handle('get-factor-invoices', () => listFactorInvoices());
ipcMain.handle('clear-factor-invoices', () => clearFactorInvoices());
ipcMain.handle('invoices-choose-root', () => ({ ok: true, path: INVOICES_DIR }));
ipcMain.handle('invoices-get-root', () => ({ ok: true, path: INVOICES_DIR }));
ipcMain.handle('invoices-save-all', (_, items) => { let count=0; for (const x of items || []) { saveInvoiceBundle(x, null, null); count++; } return { ok:true, count, path:INVOICES_DIR }; });
ipcMain.handle('invoices-save-bundle', (_, x, png, svg) => saveInvoiceBundle(x, png, svg));
ipcMain.handle('restore-backup-dialog', async () => { const r = await dialog.showOpenDialog(mainWindow, { title:'انتخاب پشتیبان SQLite', defaultPath:BACKUP_DIR, properties:['openFile'], filters:[{name:'SQLite Backup',extensions:['sqlite']}] }); if(r.canceled||!r.filePaths[0]) return {ok:false}; restoreBackup(r.filePaths[0]); return {ok:true,path:r.filePaths[0]}; });

async function smokeTest() {
  ensureDirs();
  const marker = path.join(DATA_DIR, 'smoke-marker.json');

  // 1) Write a realistic cardex/state record and verify SQLite persistence.
  const state = {
    ...defaultState(),
    seq: 4242,
    cards: [{
      id:'smoke-card',
      no:4242,
      name:'تست SQLite',
      phone:'09120000000',
      parts:[{
        id:'p1',
        name:'لنت ترمز',
        q:2,
        price:1000,
        purchasePrice:700,
        paid:0
      }],
      jobs:[{
        id:'j1',
        name:'تعویض لنت',
        mechanic:'تعمیرکار تست',
        labor:2000
      }],
      payments:[{id:'pay1',amount:1000}],
      discount:100,
      released:false
    }]
  };

  saveState(state);
  let loaded = loadState();
  if (
    loaded.seq !== 4242 ||
    loaded.cards.length !== 1 ||
    loaded.cards[0].parts[0].q !== 2 ||
    loaded.cards[0].jobs[0].labor !== 2000 ||
    loaded.cards[0].payments[0].amount !== 1000
  ) {
    throw new Error('SQLite state persistence failed');
  }

  // 2) Persist an invoice and verify its actual contents, not just row count.
  const invoice = {
    id:'smoke-invoice',
    invoiceNo:'4242',
    customer:'تست SQLite',
    phone:'09120000000',
    date:'1405/06/29',
    cardexNo:4242,
    discount:100,
    items:[
      {name:'لنت ترمز',qty:2,price:1000,type:'part'},
      {name:'تعویض لنت',qty:1,price:2000,type:'job'}
    ]
  };

  saveFactorInvoices([invoice]);
  let invoices = listFactorInvoices();
  const savedInvoice = invoices.find(x => x.id === invoice.id);
  if (
    !savedInvoice ||
    savedInvoice.customer !== 'تست SQLite' ||
    savedInvoice.cardexNo !== 4242 ||
    savedInvoice.items.length !== 2 ||
    savedInvoice.items[0].qty !== 2
  ) {
    throw new Error('Invoice persistence/content test failed');
  }

  // 3) Create a real SQLite backup.
  const backup = createBackup();
  if (!fs.existsSync(backup.path) || fs.statSync(backup.path).size < 1000) {
    throw new Error('Backup file was not created correctly');
  }

  // 4) Mutate both state and invoices after the backup.
  saveState({
    ...loaded,
    seq:9999,
    cards:[{id:'mutated-card',no:9999,name:'داده تغییر یافته',parts:[],jobs:[],payments:[]}]
  });
  clearFactorInvoices();

  loaded = loadState();
  if (loaded.seq !== 9999 || listFactorInvoices().length !== 0) {
    throw new Error('Post-backup mutation setup failed');
  }

  // 5) Restore the backup and verify both state AND invoice data return.
  restoreBackup(backup.path);
  loaded = loadState();
  invoices = listFactorInvoices();

  const restoredInvoice = invoices.find(x => x.id === 'smoke-invoice');
  if (
    loaded.seq !== 4242 ||
    loaded.cards.length !== 1 ||
    loaded.cards[0].id !== 'smoke-card' ||
    loaded.cards[0].parts[0].name !== 'لنت ترمز' ||
    loaded.cards[0].parts[0].purchasePrice !== 700 ||
    !restoredInvoice ||
    restoredInvoice.customer !== 'تست SQLite' ||
    restoredInvoice.items.length !== 2
  ) {
    throw new Error('SQLite backup/restore integrity test failed');
  }

  // 6) Leave a small marker for CI diagnostics.
  fs.writeFileSync(marker, JSON.stringify({
    ok:true,
    db:DB_PATH,
    backup:backup.path,
    restored:true,
    cardex:loaded.cards[0].no,
    invoice:restoredInvoice.invoiceNo
  }, null, 2));

  return marker;
}

app.whenReady().then(async () => {
  openDb();
  registerScheduledBackups();
  if (process.argv.includes('--backup-now')) { try { createBackup(); app.quit(); } catch (e) { console.error(e); app.exit(1); } return; }
  if (process.argv.includes('--smoke-test')) { try { const marker = await smokeTest(); console.log(`SMOKE_OK ${marker}`); app.quit(); } catch (e) { console.error(e); app.exit(1); } return; }
  makeWindow();
});
app.on('window-all-closed', () => { if (db) { try { db.close(); } catch {} } if (process.platform !== 'darwin') app.quit(); });
