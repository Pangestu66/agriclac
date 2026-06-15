/**
 * AgriCalc Cloudflare Worker Backend
 * Powered by Hono & Supabase PostgreSQL
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sign, verify } from 'hono/jwt';
import { createClient } from '@supabase/supabase-js';

const app = new Hono();

// CORS middleware supporting pre-flight requests
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Supabase helper
const getSupabase = (c) => {
  return createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
};

// Password hashing helper using standard Web Crypto API
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'agricalc-secure-salt-2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Authentication middleware
const authMiddleware = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Token tidak valid atau tidak ditemukan' }, 401);
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = await verify(token, c.env.JWT_SECRET);
    c.set('user', payload);
    await next();
  } catch (err) {
    return c.json({ error: 'Token kedaluwarsa atau tidak valid' }, 401);
  }
};

// ─── 1. Register Route ──────────────────────────────────────
app.post('/api/auth/register', async (c) => {
  try {
    const body = await c.req.json();
    const { username, email, password } = body;

    if (!username || !email || !password) {
      return c.json({ error: 'Username, email, dan password wajib diisi' }, 400);
    }

    const supabase = getSupabase(c);

    // Check if user already exists
    const { data: existing, error: checkError } = await supabase
      .from('users')
      .select('id, username, email')
      .or(`email.eq.${email},username.eq.${username}`)
      .maybeSingle();

    if (checkError) {
      console.error('[Register Check Error]', checkError);
      return c.json({ error: 'Gagal melakukan registrasi' }, 500);
    }

    if (existing) {
      if (existing.email === email) {
        return c.json({ error: 'Email sudah terdaftar' }, 400);
      }
      if (existing.username === username) {
        return c.json({ error: 'Username sudah digunakan' }, 400);
      }
    }

    // Hash password and insert
    const passwordHash = await hashPassword(password);
    const { data: user, error: insertError } = await supabase
      .from('users')
      .insert({ username, email, password_hash: passwordHash })
      .select()
      .single();

    if (insertError) {
      console.error('[Register Insert Error]', insertError);
      return c.json({ error: 'Gagal membuat akun baru' }, 500);
    }

    // Generate JWT
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    };
    const token = await sign(payload, c.env.JWT_SECRET);

    return c.json({
      token,
      user: {
        username: user.username,
        email: user.email
      }
    }, 201);
  } catch (err) {
    console.error('[Register Error]', err);
    return c.json({ error: 'Gagal melakukan registrasi' }, 500);
  }
});

// ─── 2. Login Route ─────────────────────────────────────────
app.post('/api/auth/login', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json({ error: 'Email dan password wajib diisi' }, 400);
    }

    const supabase = getSupabase(c);

    const { data: user, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (findError) {
      console.error('[Login Find Error]', findError);
      return c.json({ error: 'Gagal melakukan login' }, 500);
    }

    if (!user) {
      return c.json({ error: 'Email atau password salah' }, 401);
    }

    const passwordHash = await hashPassword(password);
    if (user.password_hash !== passwordHash) {
      return c.json({ error: 'Email atau password salah' }, 401);
    }

    // Generate JWT
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    };
    const token = await sign(payload, c.env.JWT_SECRET);

    return c.json({
      token,
      user: {
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    console.error('[Login Error]', err);
    return c.json({ error: 'Gagal melakukan login' }, 500);
  }
});

// ─── 3. Profile Route (Protected) ───────────────────────────
app.get('/api/auth/profile', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const supabase = getSupabase(c);

    // Get count of calculations for user
    const { count, error } = await supabase
      .from('calculations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (error) {
      console.error('[Profile Count Error]', error);
    }

    return c.json({
      username: user.username,
      email: user.email,
      calculationsCount: count || 0
    });
  } catch (err) {
    console.error('[Profile Error]', err);
    return c.json({ error: 'Gagal mengambil profil user' }, 500);
  }
});

// ─── 4. Sync Calculations Route (Protected) ─────────────────
app.post('/api/calculations/sync', authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const { calculations } = body;
    const user = c.get('user');

    if (!Array.isArray(calculations) || calculations.length === 0) {
      return c.json({ error: 'Daftar kalkulasi kosong' }, 400);
    }

    if (calculations.length > 50) {
      return c.json({ error: 'Maksimal 50 kalkulasi per sinkronisasi' }, 400);
    }

    const supabase = getSupabase(c);

    // Prepare calculations for bulk upsert
    const records = calculations
      .filter(calc => calc.id && calc.type && calc.title)
      .map(calc => ({
        id: calc.id,
        user_id: user.id,
        type: calc.type,
        title: calc.title,
        inputs: calc.inputs || {},
        outputs: calc.outputs || {},
        created_at: calc.timestamp || new Date().toISOString()
      }));

    if (records.length === 0) {
      return c.json({ error: 'Tidak ada kalkulasi valid untuk disinkronkan' }, 400);
    }

    // Upsert into Supabase
    const { error: upsertError } = await supabase
      .from('calculations')
      .upsert(records, { onConflict: 'id' });

    if (upsertError) {
      console.error('[Sync Upsert Error]', upsertError);
      return c.json({ error: 'Gagal menyinkronkan kalkulasi ke database' }, 500);
    }

    return c.json({
      message: `${records.length} kalkulasi berhasil disinkronkan`,
      synced: records.length
    });
  } catch (err) {
    console.error('[Sync Error]', err);
    return c.json({ error: 'Gagal menyinkronkan kalkulasi' }, 500);
  }
});

// ─── 5. Get Calculations Route (Protected) ──────────────────
app.get('/api/calculations', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const type = c.req.query('type');
    const page = Math.max(1, parseInt(c.req.query('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20')));
    const offset = (page - 1) * limit;

    const supabase = getSupabase(c);

    let query = supabase
      .from('calculations')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) {
      query = query.eq('type', type);
    }

    const { data: rows, count: total, error } = await query;

    if (error) {
      console.error('[Get Calculations Error]', error);
      return c.json({ error: 'Gagal mengambil data kalkulasi' }, 500);
    }

    const calculations = (rows || []).map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      inputs: row.inputs,
      outputs: row.outputs,
      timestamp: row.created_at
    }));

    return c.json({
      calculations,
      pagination: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit)
      }
    });
  } catch (err) {
    console.error('[Get Calculations Error]', err);
    return c.json({ error: 'Gagal mengambil data kalkulasi' }, 500);
  }
});

// ─── 6. Delete Calculation Route (Protected) ────────────────
app.delete('/api/calculations/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');

    const supabase = getSupabase(c);

    // Delete record matching ID and user_id
    const { error, count } = await supabase
      .from('calculations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('[Delete Calculation Error]', error);
      return c.json({ error: 'Gagal menghapus kalkulasi' }, 500);
    }

    return c.json({ message: 'Kalkulasi berhasil dihapus' });
  } catch (err) {
    console.error('[Delete Calculation Error]', err);
    return c.json({ error: 'Gagal menghapus kalkulasi' }, 500);
  }
});

// ─── 7. Get Market Prices Route (Public) ─────────────────────
app.get('/api/market/prices', async (c) => {
  try {
    const region = c.req.query('region');
    const supabase = getSupabase(c);

    let query = supabase.from('market_prices').select('*');
    if (region) {
      query = query.eq('region', region);
    }

    const { data: rows, error } = await query.order('region').order('crop_id');

    if (error) {
      console.error('[Get Market Prices Error]', error);
      return c.json({ error: 'Gagal mengambil data harga pasar' }, 500);
    }

    // Group by region
    const grouped = {};
    for (const row of rows || []) {
      if (!grouped[row.region]) {
        grouped[row.region] = {};
      }
      grouped[row.region][row.crop_id] = {
        name: row.crop_name,
        price_per_kg: Number(row.price_per_kg),
        currency: row.currency,
        updated_at: row.updated_at
      };
    }

    return c.json({
      updatedAt: new Date().toISOString(),
      regions: grouped
    });
  } catch (err) {
    console.error('[Get Market Prices Error]', err);
    return c.json({ error: 'Gagal mengambil data harga pasar' }, 500);
  }
});

// ─── 8. Get Market Regions Route (Public) ────────────────────
app.get('/api/market/regions', async (c) => {
  try {
    const supabase = getSupabase(c);

    // Get distinct regions
    const { data: rows, error } = await supabase
      .from('market_prices')
      .select('region');

    if (error) {
      console.error('[Get Market Regions Error]', error);
      return c.json({ error: 'Gagal mengambil daftar wilayah' }, 500);
    }

    const regions = Array.from(new Set((rows || []).map(r => r.region))).sort();

    return c.json({ regions });
  } catch (err) {
    console.error('[Get Market Regions Error]', err);
    return c.json({ error: 'Gagal mengambil daftar wilayah' }, 500);
  }
});

export default app;
