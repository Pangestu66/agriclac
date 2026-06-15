/**
 * AgriCalc - JWT Authentication Middleware
 * Verifies Bearer token and attaches user to request.
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'agricalc_fallback_secret';

/**
 * Required auth — rejects request if token is missing or invalid.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token autentikasi diperlukan' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username, email }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token telah kedaluwarsa, silakan login ulang' });
    }
    return res.status(401).json({ error: 'Token tidak valid' });
  }
}

/**
 * Optional auth — attaches user if token exists, but doesn't reject if missing.
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // Silently ignore invalid tokens in optional auth
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

module.exports = { requireAuth, optionalAuth, JWT_SECRET };
