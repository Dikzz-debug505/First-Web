/**
 * POST /api/login
 * Body: { username, password, deviceId }
 * Response: { ok, username?, isAdmin?, expired?, maxDevices?, current?, max?, message? }
 *
 * Env (Vercel):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

function sha256Hex(text) {
  return crypto.createHash('sha256').update(String(text || ''), 'utf8').digest('hex');
}

function timingSafeEqualStr(a, b) {
  const aa = Buffer.from(String(a || ''), 'utf8');
  const bb = Buffer.from(String(b || ''), 'utf8');
  if (aa.length !== bb.length) return false;
  try {
    return crypto.timingSafeEqual(aa, bb);
  } catch {
    return false;
  }
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  // CORS / method
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.end();
  }
  if (req.method !== 'POST') {
    return json(res, 405, { ok: false, message: 'Method not allowed' });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return json(res, 500, {
      ok: false,
      message: 'Server misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  const deviceId = String(body.deviceId || '').trim();

  if (username.length < 1 || username.length > 64 || password.length < 1 || password.length > 128) {
    return json(res, 200, { ok: false, message: 'Username atau password tidak valid' });
  }
  if (!deviceId || deviceId.length < 8 || deviceId.length > 128) {
    return json(res, 200, { ok: false, message: 'Device ID tidak valid' });
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // Cari user (case-insensitive)
  const { data: users, error: findErr } = await supabase
    .from('app_users')
    .select('username, password_hash, is_admin, max_devices, expiry_date, is_active')
    .ilike('username', username)
    .limit(5);

  if (findErr) {
    console.error('supabase find error', findErr);
    return json(res, 500, { ok: false, message: 'Gagal mengakses database' });
  }

  // Exact case-insensitive match (ilike bisa partial di beberapa kasus; filter exact)
  const row = (users || []).find(
    (u) => String(u.username || '').toLowerCase() === username.toLowerCase()
  );

  if (!row || !row.is_active) {
    // Delay tipis anti-timing (opsional)
    await new Promise((r) => setTimeout(r, 80 + Math.floor(Math.random() * 80)));
    return json(res, 200, { ok: false, message: 'Username atau password salah' });
  }

  const hash = sha256Hex(password);
  if (!timingSafeEqualStr(hash, row.password_hash)) {
    await new Promise((r) => setTimeout(r, 80 + Math.floor(Math.random() * 80)));
    return json(res, 200, { ok: false, message: 'Username atau password salah' });
  }

  // Expiry
  if (row.expiry_date) {
    const expDate = new Date(String(row.expiry_date));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isNaN(expDate.getTime()) || today > expDate) {
      return json(res, 200, { ok: false, expired: true, message: 'Akun sudah kedaluarsa' });
    }
  }

  const uname = String(row.username);
  const isAdmin = !!row.is_admin;

  // Device limit (skip admin)
  if (!isAdmin) {
    const maxRaw = row.max_devices;
    const unlimited = maxRaw == null || maxRaw === '' || Number(maxRaw) <= 0;
    const max = unlimited ? null : Math.max(1, Math.min(99, Number(maxRaw) || 1));

    const { data: devices, error: devErr } = await supabase
      .from('user_devices')
      .select('device_id')
      .eq('username', uname);

    if (devErr) {
      console.error('supabase devices error', devErr);
      return json(res, 500, { ok: false, message: 'Gagal cek device' });
    }

    const list = (devices || []).map((d) => d.device_id).filter(Boolean);
    const already = list.includes(deviceId);

    if (!already && max != null && list.length >= max) {
      return json(res, 200, {
        ok: false,
        maxDevices: true,
        current: list.length,
        max,
        message: 'Batas device tercapai'
      });
    }

    if (already) {
      await supabase
        .from('user_devices')
        .update({ last_seen: new Date().toISOString() })
        .eq('username', uname)
        .eq('device_id', deviceId);
    } else {
      const { error: insErr } = await supabase.from('user_devices').insert({
        username: uname,
        device_id: deviceId,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString()
      });
      if (insErr) {
        // Race: unique violation → treat as already registered
        if (insErr.code !== '23505') {
          console.error('supabase insert device', insErr);
          return json(res, 500, { ok: false, message: 'Gagal registrasi device' });
        }
      }
    }
  }

  return json(res, 200, {
    ok: true,
    username: uname,
    isAdmin
  });
};
