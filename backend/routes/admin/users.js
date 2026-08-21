/**
 * GET  /api/admin/users  — list users + device counts (admin only)
 * POST /api/admin/users  — create / update user (admin only)
 * Body POST: { username, password?, maxDevices?, expiryDate?, isEdit? }
 *
 * Auth: Authorization: Bearer <token from login>
 */
const { requireAdmin, getSupabase, sha256Hex, parseBody, json } = require('../../lib/session');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.end();
  }

  const admin = requireAdmin(req);
  if (!admin) {
    return json(res, 401, { ok: false, message: 'Unauthorized — login sebagai admin' });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return json(res, 500, { ok: false, message: 'Server misconfigured' });
  }

  if (req.method === 'GET') {
    const { data: users, error } = await supabase
      .from('app_users')
      .select('username, password_hash, is_admin, max_devices, expiry_date, is_active, created_at, updated_at')
      .order('username', { ascending: true });

    if (error) {
      console.error('admin list users', error);
      return json(res, 500, { ok: false, message: 'Gagal memuat user' });
    }

    const { data: devices, error: devErr } = await supabase
      .from('user_devices')
      .select('username, device_id, last_ip, last_seen');

    if (devErr) {
      console.error('admin list devices', devErr);
      return json(res, 500, { ok: false, message: 'Gagal memuat device' });
    }

    const deviceCount = {};
    const lastIpByUser = {};
    const lastSeenByUser = {};
    (devices || []).forEach(function (d) {
      const u = String(d.username || '');
      deviceCount[u] = (deviceCount[u] || 0) + 1;
      const ip = d.last_ip ? String(d.last_ip).trim() : '';
      if (!ip) return;
      const seen = d.last_seen ? new Date(d.last_seen).getTime() : 0;
      if (!lastIpByUser[u] || seen >= (lastSeenByUser[u] || 0)) {
        lastIpByUser[u] = ip;
        lastSeenByUser[u] = seen;
      }
    });

    const list = (users || []).map(function (u) {
      return {
        username: u.username,
        hasPassword: !!(u.password_hash && String(u.password_hash).length > 0),
        isAdmin: !!u.is_admin,
        maxDevices: u.max_devices == null ? null : Number(u.max_devices),
        expiryDate: u.expiry_date || null,
        isActive: !!u.is_active,
        deviceCount: deviceCount[u.username] || 0,
        lastIp: lastIpByUser[u.username] || null,
        source: 'supabase'
      };
    });

    return json(res, 200, { ok: true, users: list });
  }

  if (req.method === 'POST') {
    const body = parseBody(req);
    const username = String(body.username || '').trim();
    const password = body.password != null ? String(body.password) : '';
    const isEdit = !!body.isEdit;
    let maxDevices = body.maxDevices;
    if (maxDevices === '' || maxDevices == null) {
      maxDevices = null;
    } else {
      maxDevices = Math.max(1, Math.min(99, parseInt(maxDevices, 10) || 1));
    }
    const expiryDate = body.expiryDate ? String(body.expiryDate).slice(0, 10) : null;

    // Same charset as /api/login — blocks SQL/ILIKE metacharacters
    const USERNAME_RE = /^[a-zA-Z0-9._-]{1,64}$/;
    if (!username || !USERNAME_RE.test(username) || username.indexOf('\0') !== -1) {
      return json(res, 200, {
        ok: false,
        message: 'Username hanya boleh huruf, angka, titik, underscore, strip (1–64)'
      });
    }
    if (!isEdit && (!password || password.length < 1 || password.length > 128 || password.indexOf('\0') !== -1)) {
      return json(res, 200, { ok: false, message: 'Password wajib saat membuat user baru' });
    }
    if (password && (password.length > 128 || password.indexOf('\0') !== -1)) {
      return json(res, 200, { ok: false, message: 'Password maksimal 128 karakter' });
    }

    // Cari existing (parameterized .eq first, then exact case-insensitive filter)
    const { data: existingRows, error: findErr } = await supabase
      .from('app_users')
      .select('username, is_admin, password_hash')
      .eq('username', username)
      .limit(1);

    if (findErr) {
      console.error('admin find user', findErr);
      return json(res, 500, { ok: false, message: 'Gagal cek user' });
    }

    let existing = (existingRows || []).find(
      (u) => String(u.username || '').toLowerCase() === username.toLowerCase()
    );
    if (!existing) {
      const { data: rows2, error: err2 } = await supabase
        .from('app_users')
        .select('username, is_admin, password_hash')
        .ilike('username', username.replace(/[%_]/g, ''))
        .limit(5);
      if (err2) {
        return json(res, 500, { ok: false, message: 'Gagal cek user' });
      }
      existing = (rows2 || []).find(
        (u) => String(u.username || '').toLowerCase() === username.toLowerCase()
      );
    }

    if (existing && existing.is_admin) {
      return json(res, 200, { ok: false, message: 'Akun admin khusus tidak bisa diubah lewat panel' });
    }

    if (isEdit) {
      if (!existing) {
        return json(res, 200, { ok: false, message: 'User tidak ditemukan' });
      }
      const patch = {
        max_devices: maxDevices,
        expiry_date: expiryDate,
        is_active: true,
        updated_at: new Date().toISOString()
      };
      if (password) {
        patch.password_hash = sha256Hex(password);
      }
      const { error: updErr } = await supabase
        .from('app_users')
        .update(patch)
        .eq('username', existing.username);

      if (updErr) {
        console.error('admin update user', updErr);
        return json(res, 500, { ok: false, message: 'Gagal update user' });
      }
      return json(res, 200, { ok: true, message: 'User diperbarui', username: existing.username });
    }

    // Create
    if (existing) {
      return json(res, 200, { ok: false, message: 'Username sudah dipakai' });
    }

    const { error: insErr } = await supabase.from('app_users').insert({
      username: username,
      password_hash: sha256Hex(password),
      is_admin: false,
      max_devices: maxDevices,
      expiry_date: expiryDate,
      is_active: true
    });

    if (insErr) {
      console.error('admin insert user', insErr);
      if (insErr.code === '23505') {
        return json(res, 200, { ok: false, message: 'Username sudah dipakai' });
      }
      return json(res, 500, { ok: false, message: 'Gagal menambah user' });
    }

    return json(res, 200, { ok: true, message: 'User baru ditambahkan', username: username });
  }

  return json(res, 405, { ok: false, message: 'Method not allowed' });
};
