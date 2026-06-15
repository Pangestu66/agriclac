/**
 * AgriCalc Backend - Express Server Entry Point
 * Serves the static frontend and provides REST API endpoints.
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const { initDatabase } = require('./database/init');
const authRoutes = require('./routes/auth');
const calculationsRoutes = require('./routes/calculations');
const marketRoutes = require('./routes/market');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts/styles for SPA
  crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ─── API Routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/calculations', calculationsRoutes);
app.use('/api/market', marketRoutes);

// ─── Serve Static Frontend ──────────────────────────────────
app.use(express.static(path.join(__dirname, '..')));

// SPA fallback — always serve index.html for non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// ─── Error Handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// ─── Start Server ───────────────────────────────────────────
async function start() {
  try {
    // Initialize database (creates tables if they don't exist)
    initDatabase();
    console.log('✅ Database initialized');

    app.listen(PORT, () => {
      console.log(`\n🚜 AgriCalc Server running on http://localhost:${PORT}`);
      console.log(`📁 Serving frontend from the root directory`);
      console.log(`🔌 API available at http://localhost:${PORT}/api\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start();
