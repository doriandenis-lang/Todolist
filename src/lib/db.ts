import "server-only";

import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

/**
 * Base SQLite locale, stockée dans `data/todo.db` à la racine du projet.
 * Utilise le module SQLite intégré à Node (aucune dépendance native à compiler).
 */

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "todo.db");

function open() {
  mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name          TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS todos (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text       TEXT NOT NULL,
      done       INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      date       TEXT,
      deadline   TEXT
    );
    CREATE INDEX IF NOT EXISTS todos_user ON todos(user_id, created_at DESC);
  `);
  return db;
}

// Une seule connexion, conservée entre les rechargements à chaud en développement
const globalForDb = globalThis as unknown as { __todoDb?: DatabaseSync };
export const db = globalForDb.__todoDb ?? (globalForDb.__todoDb = open());

/** Exécute `fn` dans une transaction (tout ou rien). */
export function transaction<T>(fn: () => T): T {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
