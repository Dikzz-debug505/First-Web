/**
 * GET/POST /api/cleanup-expired
 * Auto-hapus semua akun user biasa yang sudah lewat expiry_date.
 *
 * Proteksi:
 * - Header: Authorization: Bearer <CRON_SECRET atau SUPABASE_SERVICE_ROLE_KEY>
 * - Atau query ?secret=<CRON_SECRET>
 *
 * Bisa dipanggil oleh Vercel Cron / external scheduler.
 */
const { getSupabase, json } = require('../lib/session');
const { cleanupAllExpiredUsers } = require('../lib/cleanup-expired');

function isAuthorized(req) {
  const secret =
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';
  if (!secret) return false;

  const auth = req.headers.authorization || req.headers.Authorization || '';
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7).trim();
    if (token && token === secret) return true;
  }

  // Vercel Cron mengirim Authorization: Bearer <CRON_SECRET> jika dikonfigurasi
  const q = req.query || {};
  if (q.secret && String(q.secret) === secret) return true;

  // Header khusus Vercel Cron (opsional)
  if (req.headers['x-vercel-cron'] === '1' && secret) {
    // Jika CRON_SECRET diset, tetap wajib Bearer; tanpa CRON_SECRET izinkan x-vercel-cron
    if (!process.env.CRON_SECRET) return true;
  }

  return false;
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

  if (req.method !== 'GET' && req.method !== 'POST') {
    return json(res, 405, { ok: false, message: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return json(res, 401, { ok: false, message: 'Unauthorized' });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return json(res, 500, { ok: false, message: 'Server misconfigured' });
  }

  const result = await cleanupAllExpiredUsers();
  return json(res, 200, {
    ok: true,
    deleted: result.deleted,
    usernames: result.usernames
  });
};
