const crypto = require('crypto');
const { getSupabase, sha256Hex, parseBody, json, issueToken } = require('../lib/session');

/** Username: 1–64 chars, only safe set (no SQL/ILIKE metacharacters) */
const USERNAME_RE = /^[a-zA-Z0-9._-]{1,64}$/;
/** Device id: hex / alnum / dash / underscore */
const DEVICE_RE = /^[a-zA-Z0-9._-]{8,128}$/;

const MAX_FAIL = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 menit sliding window
const LOCK_MS = 5 * 60 * 1000; // 5 menit lock setelah MAX_FAIL
const MSG_INVALID = 'Username atau password salah';
const MSG_LOCKED = 'Terlalu banyak percobaan. Coba lagi nanti.';
const MSG_GENERIC = 'Login gagal. Coba lagi.';

/** Best-effort in-memory rate limit (per serverless instance) */
const failBuckets = new Map();

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '';
  const raw = String(xf).split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  return raw.slice(0, 64);
}

function bucketKey(ip, username) {
  return crypto
    .createHash('sha256')
    .update(String(ip) + '|' + String(username).toLowerCase())
    .digest('hex')
    .slice(0, 32);
}

function getBucket(key) {
  const now = Date.now();
  let b = failBuckets.get(key);
  if (!b || now > b.windowEnd) {
    b = { count: 0, windowEnd: now + WINDOW_MS, lockUntil: 0 };
    failBuckets.set(key, b);
  }
  return b;
}

function isLocked(bucket) {
  return bucket.lockUntil && Date.now() < bucket.lockUntil;
}

function registerFail(bucket) {
  bucket.count += 1;
  if (bucket.count >= MAX_FAIL) {
    bucket.lockUntil = Date.now() + LOCK_MS;
    bucket.count = 0;
    bucket.windowEnd = Date.now() + WINDOW_MS;
  }
}

function clearFails(key) {
  failBuckets.delete(key);
}

function timingSafeEqualStr(a, b) {
  const aa = Buffer.from(String(a || ''), 'utf8');
  const bb = Buffer.from(String(b || ''), 'utf8');
  if (aa.length !== bb.length) {
    try {
      crypto.timingSafeEqual(aa, aa);
    } catch (_) {}
    return false;
  }
  try {
    return crypto.timingSafeEqual(aa, bb);
  } catch {
    return false;
  }
}

function hasNullByte(s) {
  return String(s).indexOf('\0') !== -1;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function failResponse(res, message, extra) {
  await sleep(120 + Math.floor(Math.random() * 160));
  const body = Object.assign({ ok: false, message: message || MSG_INVALID }, extra || {});
  return json(res, 200, body);
}

module.exports = async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.end();
  }
  if (req.method !== 'POST') {
    return json(res, 405, { ok: false, message: 'Method not allowed' });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return json(res, 500, { ok: false, message: MSG_GENERIC });
  }

  const body = parseBody(req);
  const usernameRaw = String(body.username || '').trim();
  const password = String(body.password || '');
  const deviceId = String(body.deviceId || '').trim();

  if (
    !usernameRaw ||
    !USERNAME_RE.test(usernameRaw) ||
    hasNullByte(usernameRaw) ||
    hasNullByte(password) ||
    password.length < 1 ||
    password.length > 128 ||
    !DEVICE_RE.test(deviceId) ||
    hasNullByte(deviceId)
  ) {
    return failResponse(res, MSG_INVALID);
  }

  const username = usernameRaw;
  const ip = clientIp(req);
  const key = bucketKey(ip, username);
  const bucket = getBucket(key);

  if (isLocked(bucket)) {
    const retrySec = Math.max(1, Math.ceil((bucket.lockUntil - Date.now()) / 1000));
    return failResponse(res, MSG_LOCKED, { locked: true, retryAfter: retrySec });
  }

  let users = null;
  let findErr = null;
  try {
    const result = await supabase
      .from('app_users')
      .select('username, password_hash, is_admin, is_super, max_devices, expiry_date, is_active')
      .eq('username', username)
      .limit(1);
    users = result.data;
    findErr = result.error;

    if (!findErr && (!users || users.length === 0)) {
      const result2 = await supabase
        .from('app_users')
        .select('username, password_hash, is_admin, is_super, max_devices, expiry_date, is_active')
        .ilike('username', username.replace(/[%_]/g, '')) // strip any wildcard chars (already blocked by regex)
        .limit(3);
      if (!result2.error && result2.data) {
        users = result2.data.filter(
          (u) => String(u.username || '').toLowerCase() === username.toLowerCase()
        );
      }
      findErr = result2.error || findErr;
    }
  } catch (e) {
    console.error('login query exception');
    return json(res, 500, { ok: false, message: MSG_GENERIC });
  }

  if (findErr) {
    console.error('supabase find error');
    return json(res, 500, { ok: false, message: MSG_GENERIC });
  }

  const row = (users || []).find(
    (u) => String(u.username || '').toLowerCase() === username.toLowerCase()
  );

  if (!row || !row.is_active) {
    registerFail(bucket);
    return failResponse(res, MSG_INVALID);
  }

  const hash = sha256Hex(password);
  if (!timingSafeEqualStr(hash, row.password_hash)) {
    registerFail(bucket);
    return failResponse(res, MSG_INVALID);
  }

  if (row.expiry_date) {
    const expDate = new Date(String(row.expiry_date));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isNaN(expDate.getTime()) || today > expDate) {
      return failResponse(res, 'Akun sudah kedaluarsa', { expired: true });
    }
  }

  const uname = String(row.username);
  const isAdmin = !!row.is_admin;
  // Super hanya jika is_super = true (sub-admin: is_admin=true, is_super=false)
  const isSuper = isAdmin && !!row.is_super;

  if (!isAdmin) {
    try {
      const { data: maintRows } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .limit(1);
      const maintOn =
        maintRows &&
        maintRows[0] &&
        String(maintRows[0].value || '').toLowerCase() === 'true';
      if (maintOn) {
        return failResponse(res, 'Website sedang diupdate. Silakan coba lagi nanti.', {
          maintenance: true
        });
      }
    } catch (e) {
      console.error('login maintenance check');
    }
  }

  if (!isAdmin) {
    const maxRaw = row.max_devices;
    const unlimited = maxRaw == null || maxRaw === '' || Number(maxRaw) <= 0;
    const max = unlimited ? null : Math.max(1, Math.min(99, Number(maxRaw) || 1));

    const { data: devices, error: devErr } = await supabase
      .from('user_devices')
      .select('device_id')
      .eq('username', uname);

    if (devErr) {
      console.error('supabase devices error');
      return json(res, 500, { ok: false, message: MSG_GENERIC });
    }

    const list = (devices || []).map((d) => d.device_id).filter(Boolean);
    const already = list.includes(deviceId);

    if (!already && max != null && list.length >= max) {
      return failResponse(res, 'Batas device tercapai', {
        maxDevices: true,
        current: list.length,
        max
      });
    }

    if (already) {
      await supabase
        .from('user_devices')
        .update({ last_seen: new Date().toISOString(), last_ip: ip })
        .eq('username', uname)
        .eq('device_id', deviceId);
    } else {
      const { error: insErr } = await supabase.from('user_devices').insert({
        username: uname,
        device_id: deviceId,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        last_ip: ip
      });
      if (insErr && insErr.code !== '23505') {
        console.error('supabase insert device');
        return json(res, 500, { ok: false, message: MSG_GENERIC });
      }
    }
  }

  clearFails(key);

  const token = issueToken(uname, isAdmin, isSuper);
  return json(res, 200, {
    ok: true,
    username: uname,
    isAdmin,
    isSuper: !!isSuper,
    token: token || undefined
  });
};
