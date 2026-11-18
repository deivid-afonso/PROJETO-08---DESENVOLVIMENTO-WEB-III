import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'database.sqlite');

const sqlite = new DatabaseSync(dbPath);

const db = {
  run(sql, params = [], callback) {
    const cb = typeof params === 'function' ? params : callback;
    const bindParams = Array.isArray(params) ? params : [];
    try {
      const stmt = sqlite.prepare(sql);
      const result = stmt.run(...bindParams);
      if (cb) {
        cb.call({ lastID: Number(result.lastInsertRowid), changes: result.changes }, null);
      }
    } catch (err) {
      if (cb) cb.call({}, err);
    }
  },
  get(sql, params = [], callback) {
    const cb = typeof params === 'function' ? params : callback;
    const bindParams = Array.isArray(params) ? params : [];
    try {
      const stmt = sqlite.prepare(sql);
      const row = stmt.get(...bindParams);
      if (cb) cb(null, row);
    } catch (err) {
      if (cb) cb(err, null);
    }
  },
  all(sql, params = [], callback) {
    const cb = typeof params === 'function' ? params : callback;
    const bindParams = Array.isArray(params) ? params : [];
    try {
      const stmt = sqlite.prepare(sql);
      const rows = stmt.all(...bindParams);
      if (cb) cb(null, rows);
    } catch (err) {
      if (cb) cb(err, null);
    }
  }
};

db.run(`
  CREATE TABLE IF NOT EXISTS fornecedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cnpj TEXT NOT NULL,
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    telefone TEXT,
    email TEXT,
    cidade TEXT,
    uf TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    categoria TEXT,
    quantidade INTEGER NOT NULL DEFAULT 0,
    preco_unitario REAL NOT NULL DEFAULT 0.0,
    fornecedor_id INTEGER,
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)
  )
`);

console.log('Conectado ao banco SQLite (database.sqlite) - Sistema de Controle de Estoque.');

export default db;
