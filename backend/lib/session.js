const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 jam (selaras session client)

function getSecret() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function b64urlJson(obj) {
  return b64url(JSON.stringify(obj));
}

/**
 * @param {string} username
 * @param {boolean} isAdmin  — true untuk super maupun sub-admin
 * @param {boolean} [isSuper] — true hanya untuk super admin (panel utama)
 */
function issueToken(username, isAdmin, isSuper) {
  const secret = getSecret();
  if (!secret) return null;
  const payload = {
    u: String(username || '').trim(),
    a: !!isAdmin,
    s: !!isSuper,
    exp: Date.now() + TOKEN_TTL_MS
  };
  const body = b64urlJson(payload);
  const sig = b64url(
    crypto.createHmac('sha256', secret).update(body).digest()
  );
  return body + '.' + sig;
}

function verifyToken(token) {
  const secret = getSecret();
  if (!secret || !token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = b64url(
    crypto.createHmac('sha256', secret).update(body).digest()
  );
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const json = Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const payload = JSON.parse(json);
    if (!payload || !payload.u || typeof payload.u !== 'string') return null;
    if (!payload.exp || Date.now() > Number(payload.exp)) return null;
    return {
      username: payload.u,
      isAdmin: !!payload.a,
      isSuper: !!payload.s
    };
  } catch {
    return null;
  }
}

function getBearerToken(req) {
  const h = req.headers && (req.headers.authorization || req.headers.Authorization);
  if (!h || typeof h !== 'string') return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

/** Any admin (super atau sub-admin) */
function requireAdmin(req) {
  const token = getBearerToken(req);
  const sess = verifyToken(token);
  if (!sess || !sess.isAdmin) return null;
  return sess;
}

/** Hanya super admin (panel utama) */
function requireSuperAdmin(req) {
  const token = getBearerToken(req);
  const sess = verifyToken(token);
  if (!sess || !sess.isAdmin || !sess.isSuper) return null;
  return sess;
}

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function sha256Hex(text) {
  return crypto.createHash('sha256').update(String(text || ''), 'utf8').digest('hex');
}

function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  return body || {};
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

module.exports = {
  issueToken,
  verifyToken,
  requireAdmin,
  requireSuperAdmin,
  getSupabase,
  sha256Hex,
  parseBody,
  json
};
