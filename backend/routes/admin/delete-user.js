/**
 * POST /api/admin/delete-user
 * Body: { username }
 * Hard-delete: hapus row user + device registry (username bisa dipakai ulang)
 * Auth: Bearer admin token
 *
 * Aturan:
 *   - Super Admin boleh hapus user biasa dan admin biasa (is_admin, !is_super)
 *   - Admin biasa hanya boleh hapus user biasa
 *   - Akun Super Admin tidak bisa dihapus oleh siapapun lewat endpoint ini
 */
const { requireAdmin, getSupabase, parseBody, json } = require('../../lib/session');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.end();
  }
  if (req.method !== 'POST') {
    return json(res, 405, { ok: false, message: 'Method not allowed' });
  }

  const admin = requireAdmin(req);
  if (!admin) {
    return json(res, 401, { ok: false, message: 'Unauthorized' });
  }

  const isSuper = !!admin.isSuper;
  const supabase = getSupabase();
  if (!supabase) {
    return json(res, 500, { ok: false, message: 'Server misconfigured' });
  }

  const body = parseBody(req);
  const username = String(body.username || '').trim();
  if (!username) {
    return json(res, 200, { ok: false, message: 'Username wajib' });
  }

  const { data: rows, error: findErr } = await supabase
    .from('app_users')
    .select('username, is_admin, is_super')
    .ilike('username', username)
    .limit(5);

  if (findErr) {
    return json(res, 500, { ok: false, message: 'Gagal cek user' });
  }

  const row = (rows || []).find(
    (u) => String(u.username || '').toLowerCase() === username.toLowerCase()
  );

  if (!row) {
    return json(res, 200, { ok: false, message: 'User tidak ditemukan' });
  }

  // Super Admin tidak boleh dihapus lewat endpoint ini
  if (row.is_admin && row.is_super) {
    return json(res, 200, { ok: false, message: 'Akun Super Admin tidak bisa dihapus' });
  }

  // Admin biasa hanya bisa dihapus oleh Super Admin
  if (row.is_admin && !isSuper) {
    return json(res, 200, { ok: false, message: 'Akun admin tidak bisa dihapus' });
  }

  const uname = row.username;

  await supabase.from('user_devices').delete().eq('username', uname);

  const { error: delErr } = await supabase
    .from('app_users')
    .delete()
    .eq('username', uname);

  if (delErr) {
    console.error('admin hard-delete', delErr);
    return json(res, 500, { ok: false, message: 'Gagal menghapus user' });
  }

  return json(res, 200, { ok: true, message: 'User dihapus', username: uname });
};
