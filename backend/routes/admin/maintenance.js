/**
 * GET  /api/admin/maintenance — status (admin only)
 * POST /api/admin/maintenance — set { enabled: true|false } (admin only)
 */
const { requireAdmin, getSupabase, parseBody, json } = require('../../lib/session');

async function ensureSettingsTable(supabase) {
}

module.exports = async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');

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
    const { data, error } = await supabase
      .from('app_settings')
      .select('value, updated_at')
      .eq('key', 'maintenance_mode')
      .limit(1);

    if (error) {
      console.error('admin get maintenance', error);
      return json(res, 500, {
        ok: false,
        message: 'Gagal memuat status. Pastikan tabel app_settings sudah dibuat di Supabase.'
      });
    }

    const row = (data || [])[0];
    const on = row && String(row.value || '').toLowerCase() === 'true';
    return json(res, 200, {
      ok: true,
      maintenance: !!on,
      updatedAt: row ? row.updated_at : null
    });
  }

  if (req.method === 'POST') {
    const body = parseBody(req);
    const enabled = !!body.enabled;

    const payload = {
      key: 'maintenance_mode',
      value: enabled ? 'true' : 'false',
      updated_at: new Date().toISOString()
    };

    const { data: existing, error: findErr } = await supabase
      .from('app_settings')
      .select('key')
      .eq('key', 'maintenance_mode')
      .limit(1);

    if (findErr) {
      console.error('admin maintenance find', findErr);
      return json(res, 500, {
        ok: false,
        message: 'Gagal update. Pastikan tabel app_settings sudah dibuat di Supabase (jalankan schema SQL).'
      });
    }

    let writeErr = null;
    if (existing && existing.length > 0) {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: payload.value, updated_at: payload.updated_at })
        .eq('key', 'maintenance_mode');
      writeErr = error;
    } else {
      const { error } = await supabase.from('app_settings').insert(payload);
      writeErr = error;
    }

    if (writeErr) {
      console.error('admin maintenance write', writeErr);
      return json(res, 500, {
        ok: false,
        message: 'Gagal menyimpan. Pastikan tabel app_settings sudah dibuat di Supabase.'
      });
    }

    return json(res, 200, {
      ok: true,
      maintenance: enabled,
      message: enabled
        ? 'Mode update website AKTIF — user biasa tidak bisa login'
        : 'Mode update website NONAKTIF — user biasa bisa login kembali'
    });
  }

  return json(res, 405, { ok: false, message: 'Method not allowed' });
};
