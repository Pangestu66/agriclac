/**
 * AgriCalc - Database Initialization (SQLite via better-sqlite3)
 * Creates tables for users, calculations, and market prices.
 */
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'agricalc.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDatabase() {
  const conn = getDb();

  // ── Users Table ──────────────────────────────────────────
  conn.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── Calculations Table ───────────────────────────────────
  conn.exec(`
    CREATE TABLE IF NOT EXISTS calculations (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      inputs TEXT NOT NULL,
      outputs TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // ── Market Prices Table ──────────────────────────────────
  conn.exec(`
    CREATE TABLE IF NOT EXISTS market_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crop_id TEXT NOT NULL,
      crop_name TEXT NOT NULL,
      region TEXT NOT NULL DEFAULT 'Nasional',
      price_per_kg REAL NOT NULL,
      currency TEXT DEFAULT 'IDR',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── Seed Default Market Prices (if empty) ────────────────
  const count = conn.prepare('SELECT COUNT(*) as cnt FROM market_prices').get();
  if (count.cnt === 0) {
    const insert = conn.prepare(`
      INSERT INTO market_prices (crop_id, crop_name, region, price_per_kg)
      VALUES (?, ?, ?, ?)
    `);

    const seedData = [
      ['padi', 'Padi Sawah (Rice)', 'Nasional', 6500],
      ['jagung', 'Jagung Hibrida (Hybrid Maize)', 'Nasional', 4800],
      ['kelapa_sawit', 'Kelapa Sawit (Oil Palm)', 'Nasional', 2400],
      ['tomat', 'Tomat Hortikultura (Tomato)', 'Nasional', 9000],
      ['cabai', 'Cabai Merah (Red Chili)', 'Nasional', 25000],
      ['kedelai', 'Kedelai (Soybean)', 'Nasional', 11000],
      // Regional variants
      ['padi', 'Padi Sawah', 'Jawa Timur', 6800],
      ['jagung', 'Jagung Hibrida', 'Jawa Timur', 5000],
      ['cabai', 'Cabai Merah', 'Jawa Timur', 28000],
      ['padi', 'Padi Sawah', 'Jawa Barat', 6300],
      ['jagung', 'Jagung Hibrida', 'Jawa Barat', 4600],
      ['cabai', 'Cabai Merah', 'Jawa Barat', 30000],
      ['padi', 'Padi Sawah', 'Sumatera Utara', 6700],
      ['kelapa_sawit', 'Kelapa Sawit', 'Sumatera Utara', 2200],
      ['padi', 'Padi Sawah', 'Sulawesi Selatan', 6400],
      ['jagung', 'Jagung Hibrida', 'Sulawesi Selatan', 4500]
    ];

    const insertMany = conn.transaction((data) => {
      for (const row of data) {
        insert.run(...row);
      }
    });
    insertMany(seedData);
    console.log('📊 Seeded market prices with', seedData.length, 'entries');
  }

  return conn;
}

module.exports = { getDb, initDatabase };
