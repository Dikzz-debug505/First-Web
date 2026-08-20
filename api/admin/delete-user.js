/**
 * POST /api/admin/delete-user
 * Body: { username }
 * Soft-delete: is_active = false + hapus device registry
 * Auth: Bearer admin token
 */
const { requireAdmin, getSupabase, parseBody, json } = require('../lib/session');

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
    .select('username, is_admin')
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
  if (row.is_admin) {
    return json(res, 200, { ok: false, message: 'Akun admin tidak bisa dihapus' });
  }

  const uname = row.username;

  // Soft delete
  const { error: updErr } = await supabase
    .from('app_users')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('username', uname);

  if (updErr) {
    console.error('admin soft-delete', updErr);
    return json(res, 500, { ok: false, message: 'Gagal menghapus user' });
  }

  await supabase.from('user_devices').delete().eq('username', uname);

  return json(res, 200, { ok: true, message: 'User dihapus (dinonaktifkan)', username: uname });
};
