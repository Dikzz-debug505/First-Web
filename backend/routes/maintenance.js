/**
 * GET /api/maintenance — public status (no auth)
 * Returns { ok: true, maintenance: boolean }
 */
const { getSupabase, json } = require('../lib/session');

module.exports = async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.end();
  }
  if (req.method !== 'GET') {
    return json(res, 405, { ok: false, message: 'Method not allowed' });
  }

  const supabase = getSupabase();
  if (!supabase) {
    // Default off if misconfigured — jangan lock semua user
    return json(res, 200, { ok: true, maintenance: false });
  }

  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .limit(1);

    if (error) {
      console.error('maintenance status', error);
      return json(res, 200, { ok: true, maintenance: false });
    }

    const row = (data || [])[0];
    const on = row && String(row.value || '').toLowerCase() === 'true';
    return json(res, 200, { ok: true, maintenance: !!on });
  } catch (e) {
    console.error('maintenance status exception');
    return json(res, 200, { ok: true, maintenance: false });
  }
};
