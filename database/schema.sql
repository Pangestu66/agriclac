-- AgriCalc - Supabase PostgreSQL Database Schema
-- Run this script in the Supabase SQL Editor (https://database.new)

-- ── 1. Users Table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Calculations Table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS calculations (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  inputs JSONB NOT NULL,
  outputs JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_calculations_user_id ON calculations(user_id);

-- ── 3. Market Prices Table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS market_prices (
  id SERIAL PRIMARY KEY,
  crop_id TEXT NOT NULL,
  crop_name TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'Nasional',
  price_per_kg NUMERIC NOT NULL,
  currency TEXT DEFAULT 'IDR',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index to allow simple upsert updates
CREATE UNIQUE INDEX IF NOT EXISTS idx_market_prices_crop_region ON market_prices(crop_id, region);

-- ── 4. Seed Default Market Prices ──────────────────────────
INSERT INTO market_prices (crop_id, crop_name, region, price_per_kg) VALUES
('padi', 'Padi Sawah (Rice)', 'Nasional', 6500),
('jagung', 'Jagung Hibrida (Hybrid Maize)', 'Nasional', 4800),
('kelapa_sawit', 'Kelapa Sawit (Oil Palm)', 'Nasional', 2400),
('tomat', 'Tomat Hortikultura (Tomato)', 'Nasional', 9000),
('cabai', 'Cabai Merah (Red Chili)', 'Nasional', 25000),
('kedelai', 'Kedelai (Soybean)', 'Nasional', 11000),
('padi', 'Padi Sawah', 'Jawa Timur', 6800),
('jagung', 'Jagung Hibrida', 'Jawa Timur', 5000),
('cabai', 'Cabai Merah', 'Jawa Timur', 28000),
('padi', 'Padi Sawah', 'Jawa Barat', 6300),
('jagung', 'Jagung Hibrida', 'Jawa Barat', 4600),
('cabai', 'Cabai Merah', 'Jawa Barat', 30000),
('padi', 'Padi Sawah', 'Sumatera Utara', 6700),
('kelapa_sawit', 'Kelapa Sawit', 'Sumatera Utara', 2200),
('padi', 'Padi Sawah', 'Sulawesi Selatan', 6400),
('jagung', 'Jagung Hibrida', 'Sulawesi Selatan', 4500)
ON CONFLICT (crop_id, region) DO UPDATE 
SET price_per_kg = EXCLUDED.price_per_kg,
    updated_at = NOW();
