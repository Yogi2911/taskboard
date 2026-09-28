const fs = require('fs');
const path = require('path');
// Built into Node 22.13+ and 24 - no native modules to compile.
const { DatabaseSync } = require('node:sqlite');

function openDb(dbPath) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  }
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS tasks (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT    NOT NULL,
      notes      TEXT    NOT NULL DEFAULT '',
      status     TEXT    NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','doing','done')),
      priority   TEXT    NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
      due_date   TEXT,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  `);
  return db;
}

module.exports = { openDb };
