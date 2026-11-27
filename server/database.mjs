import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, openSync, closeSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';

export function openDatabase(path) {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    closeSync(openSync(path, 'a', 0o600));
    if (process.platform !== 'win32') chmodSync(path, 0o600);
  }
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 3000;
    CREATE TABLE IF NOT EXISTS cart_sessions (
      session_hash TEXT PRIMARY KEY,
      cart_id TEXT,
      refreshed_at INTEGER NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS cart_adds (
      session_hash TEXT NOT NULL,
      operation_id TEXT NOT NULL,
      variant_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (session_hash, operation_id)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS newsletter (
      email TEXT PRIMARY KEY,
      subscription_id TEXT NOT NULL UNIQUE,
      state TEXT NOT NULL CHECK (state IN ('pending','active','unsubscribed')),
      verification_hash TEXT UNIQUE,
      expires_at INTEGER,
      consent_version TEXT NOT NULL,
      requested_at INTEGER NOT NULL,
      confirmed_at INTEGER,
      unsubscribed_at INTEGER
    ) STRICT;
  `);
  return db;
}
