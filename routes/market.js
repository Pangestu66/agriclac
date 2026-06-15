/**
 * AgriCalc - Market Prices Routes
 * GET /api/market/prices          - Get all market prices (public)
 * GET /api/market/prices/:cropId  - Get prices for a specific crop
 * GET /api/market/regions         - List available regions
 */
const express = require('express');
const { getDb } = require('../database/init');

const router = express.Router();

// ─── Get All Market Prices ──────────────────────────────────
router.get('/prices', (req, res) => {
  try {
    const db = getDb();
    const region = req.query.region;

    let rows;
    if (region) {
      rows = db.prepare(
        'SELECT * FROM market_prices WHERE region = ? ORDER BY crop_id'
      ).all(region);
    } else {
      rows = db.prepare(
        'SELECT * FROM market_prices ORDER BY region, crop_id'
      ).all();
    }

    // Group by region
    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.region]) {
        grouped[row.region] = {};
      }
      grouped[row.region][row.crop_id] = {
        name: row.crop_name,
        price_per_kg: row.price_per_kg,
        currency: row.currency,
        updated_at: row.updated_at
      };
    }

    res.json({
      updatedAt: new Date().toISOString(),
      regions: grouped
    });
  } catch (err) {
    console.error('[Market Prices Error]', err);
    res.status(500).json({ error: 'Gagal mengambil data harga pasar' });
  }
});

// ─── Get Prices for Specific Crop ───────────────────────────
router.get('/prices/:cropId', (req, res) => {
  try {
    const db = getDb();
    const { cropId } = req.params;

    const rows = db.prepare(
      'SELECT * FROM market_prices WHERE crop_id = ? ORDER BY region'
    ).all(cropId);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Komoditas tidak ditemukan' });
    }

    const prices = rows.map(row => ({
      region: row.region,
      price_per_kg: row.price_per_kg,
      currency: row.currency,
      updated_at: row.updated_at
    }));

    res.json({
      crop_id: cropId,
      crop_name: rows[0].crop_name,
      prices
    });
  } catch (err) {
    console.error('[Market Crop Price Error]', err);
    res.status(500).json({ error: 'Gagal mengambil data harga' });
  }
});

// ─── Get Available Regions ──────────────────────────────────
router.get('/regions', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(
      'SELECT DISTINCT region FROM market_prices ORDER BY region'
    ).all();

    res.json({
      regions: rows.map(r => r.region)
    });
  } catch (err) {
    console.error('[Market Regions Error]', err);
    res.status(500).json({ error: 'Gagal mengambil daftar wilayah' });
  }
});

module.exports = router;
