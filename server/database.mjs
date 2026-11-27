import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, openSync, closeSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';

export const schema = `
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
    CREATE TABLE IF NOT EXISTS cart_locks (
      session_hash TEXT PRIMARY KEY,
      owner TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS request_windows (
      bucket TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
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
    CREATE TABLE IF NOT EXISTS product_inventory (
      sku TEXT PRIMARY KEY,
      stock INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS orders (
      order_id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      status TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL,
      razorpay_order_id TEXT,
      razorpay_payment_id TEXT,
      customer_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      address_json TEXT NOT NULL,
      items_json TEXT NOT NULL,
      discount_code TEXT,
      subtotal_paise INTEGER NOT NULL,
      discount_paise INTEGER NOT NULL,
      shipping_paise INTEGER NOT NULL,
      total_paise INTEGER NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS support_tickets (
      ticket_id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      topic TEXT NOT NULL,
      order_id TEXT,
      message TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS waitlist (
      email TEXT NOT NULL,
      product_slug TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (email, product_slug)
    ) STRICT;
`;

export function openDatabase(path) {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    closeSync(openSync(path, 'a', 0o600));
    if (process.platform !== 'win32') chmodSync(path, 0o600);
  }
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 3000;');
  db.exec(schema);
  return db;
}
