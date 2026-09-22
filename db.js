const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

class WorkshopDB {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.SQL = null;
    this.db = null;
  }

  async init() {
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    this.SQL = await initSqlJs({
      locateFile: file => path.join(path.dirname(require.resolve('sql.js')), file)
    });
    if (fs.existsSync(this.dbPath)) {
      const bytes = fs.readFileSync(this.dbPath);
      this.db = new this.SQL.Database(bytes);
    } else {
      this.db = new this.SQL.Database();
    }
    this.db.run(`CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL, updated_at TEXT NOT NULL)`);
    this.db.run(`CREATE TABLE IF NOT EXISTS factor_invoices (id TEXT PRIMARY KEY, json TEXT NOT NULL, updated_at TEXT NOT NULL)`);
    this.db.run(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
    this.flush();
  }

  flush() {
    const bytes = this.db.export();
    const tmp = this.dbPath + '.tmp';
    fs.writeFileSync(tmp, Buffer.from(bytes));
    fs.renameSync(tmp, this.dbPath);
  }

  loadState() {
    const r = this.db.exec(`SELECT json FROM app_state WHERE id=1`);
    return r.length && r[0].values.length ? JSON.parse(r[0].values[0][0]) : null;
  }

  saveState(state) {
    const json = JSON.stringify(state);
    const now = new Date().toISOString();
    this.db.run(`INSERT INTO app_state(id,json,updated_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json,updated_at=excluded.updated_at`, [json, now]);
    this.flush();
  }

  clearFactorInvoices() {
    this.db.run('DELETE FROM factor_invoices');
    this.flush();
  }

  saveFactorInvoices(invoices) {
    const now = new Date().toISOString();
    const tx = this.db;
    tx.run('BEGIN');
    try {
      for (const inv of invoices || []) {
        tx.run(`INSERT INTO factor_invoices(id,json,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json,updated_at=excluded.updated_at`, [String(inv.id), JSON.stringify(inv), now]);
      }
      tx.run('COMMIT');
      this.flush();
    } catch (e) {
      try { tx.run('ROLLBACK'); } catch {}
      throw e;
    }
  }

  exportJson() {
    const state = this.loadState();
    const r = this.db.exec(`SELECT json FROM factor_invoices ORDER BY updated_at DESC`);
    const invoices = r.length ? r[0].values.map(v => JSON.parse(v[0])) : [];
    return { version: 1, createdAt: new Date().toISOString(), app: state, invoices };
  }
}

module.exports = { WorkshopDB };
