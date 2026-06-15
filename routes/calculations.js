/**
 * AgriCalc - Calculations Routes
 * POST   /api/calculations/sync  - Bulk sync calculations from client
 * GET    /api/calculations       - Get all user's calculations
 * DELETE /api/calculations/:id   - Delete a specific calculation
 */
const express = require('express');
const { getDb } = require('../database/init');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// All calculation routes require authentication
router.use(requireAuth);

// ─── Sync Calculations (Bulk Upsert) ────────────────────────
router.post('/sync', (req, res) => {
  try {
    const { calculations } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(calculations) || calculations.length === 0) {
      return res.status(400).json({ error: 'Daftar kalkulasi kosong' });
    }

    // Limit to 50 calculations per sync
    if (calculations.length > 50) {
      return res.status(400).json({ 
        error: 'Maksimal 50 kalkulasi per sinkronisasi' 
      });
    }

    const db = getDb();

    const upsert = db.prepare(`
      INSERT INTO calculations (id, user_id, type, title, inputs, outputs, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        inputs = excluded.inputs,
        outputs = excluded.outputs
    `);

    const syncMany = db.transaction((calcs) => {
      let synced = 0;
      for (const calc of calcs) {
        if (!calc.id || !calc.type || !calc.title) continue;
        
        upsert.run(
          calc.id,
          userId,
          calc.type,
          calc.title,
          JSON.stringify(calc.inputs || {}),
          JSON.stringify(calc.outputs || {}),
          calc.timestamp || new Date().toISOString()
        );
        synced++;
      }
      return synced;
    });

    const syncedCount = syncMany(calculations);

    res.json({
      message: `${syncedCount} kalkulasi berhasil disinkronkan`,
      synced: syncedCount
    });
  } catch (err) {
    console.error('[Calculations Sync Error]', err);
    res.status(500).json({ error: 'Gagal menyinkronkan kalkulasi' });
  }
});

// ─── Get All User Calculations ──────────────────────────────
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;

    // Support pagination
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    // Optional type filter
    const type = req.query.type;

    let query, params;
    if (type) {
      query = `SELECT * FROM calculations WHERE user_id = ? AND type = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params = [userId, type, limit, offset];
    } else {
      query = `SELECT * FROM calculations WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params = [userId, limit, offset];
    }

    const rows = db.prepare(query).all(...params);

    // Parse JSON fields
    const calculations = rows.map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      inputs: JSON.parse(row.inputs),
      outputs: JSON.parse(row.outputs),
      timestamp: row.created_at
    }));

    // Get total count
    const countQuery = type
      ? 'SELECT COUNT(*) as total FROM calculations WHERE user_id = ? AND type = ?'
      : 'SELECT COUNT(*) as total FROM calculations WHERE user_id = ?';
    const countParams = type ? [userId, type] : [userId];
    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({
      calculations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('[Calculations Get Error]', err);
    res.status(500).json({ error: 'Gagal mengambil data kalkulasi' });
  }
});

// ─── Delete a Calculation ───────────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare(
      'DELETE FROM calculations WHERE id = ? AND user_id = ?'
    ).run(req.params.id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Kalkulasi tidak ditemukan' });
    }

    res.json({ message: 'Kalkulasi berhasil dihapus' });
  } catch (err) {
    console.error('[Calculations Delete Error]', err);
    res.status(500).json({ error: 'Gagal menghapus kalkulasi' });
  }
});

module.exports = router;
