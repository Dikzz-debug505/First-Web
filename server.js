/**
 * MLBB Unity Tools — Express + EJS + Supabase
 * User data disimpan di Supabase (service role hanya di server).
 *
 * npm install && cp .env.example .env && npm start
 */
require('dotenv').config();

const path = require('path');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const PORT = Number(process.env.PORT) || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-me';
const JWT_EXPIRES = '12h';
const BCRYPT_ROUNDS = 10;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[WARN] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum di-set di .env');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json({ limit: '64kb' }));

app.use(express.static(__dirname, {
  index: false,
  setHeaders(res, filePath) {
    if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

function publicUser(row) {
  if (!row) return null;
  return {
    username: row.username,
    isAdmin: !!row.is_admin,
    maxDevices: row.max_devices == null ? null : Number(row.max_devices),
    expiryDate: row.expiry_date || null,
    deviceCount: row.device_count != null ? Number(row.device_count) : undefined
  };
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function authMiddleware(req, res, next) {
  const hdr = req.headers.authorization || '';
  const m = hdr.match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ ok: false, error: 'unauthorized' });
  try {
    req.user = jwt.verify(m[1], JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ ok: false, error: 'invalid_token' });
  }
}

function adminOnly(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ ok: false, error: 'admin_only' });
  }
  next();
}

async function findUserByUsername(username) {
  const u = String(username || '').trim();
  if (!u) return null;
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .ilike('username', u)
    .limit(5);
  if (error) throw error;
  const rows = data || [];
  return rows.find(function (r) {
    return String(r.username).toLowerCase() === u.toLowerCase();
  }) || null;
}

async function countDevices(userId) {
  const { count, error } = await supabase
    .from('user_devices')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) throw error;
  return count || 0;
}

async function listDeviceIds(userId) {
  const { data, error } = await supabase
    .from('user_devices')
    .select('device_id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data || []).map(function (r) { return r.device_id; });
}

async function registerDevice(userId, deviceId, maxDevices) {
  if (maxDevices == null || maxDevices === '' || Number(maxDevices) <= 0) {
    return { ok: true, unlimited: true };
  }
  const max = Math.max(1, Math.min(99, Number(maxDevices) || 1));
  const existing = await listDeviceIds(userId);
  if (existing.indexOf(deviceId) !== -1) return { ok: true, current: existing.length, max: max };
  if (existing.length >= max) {
    return { ok: false, reason: 'max_devices', current: existing.length, max: max };
  }
  const { error } = await supabase.from('user_devices').insert({
    user_id: userId,
    device_id: deviceId
  });
  if (error) throw error;
  return { ok: true, current: existing.length + 1, max: max };
}

app.get('/', function (req, res) {
  res.render('index', {
    lang: 'id',
    title: 'MLBB Unity Tools',
    appName: 'MLBB Unity Tools',
    appDesc: 'Hero.bytes Viewer, Document Extractor & GameObject Overrider — Export/Import & Patch',
    loginSubtitle: 'Masuk untuk mengakses tools',
    assetBase: '/'
  });
});

app.post('/api/auth/login', async function (req, res) {
  try {
    const username = String((req.body && req.body.username) || '').trim();
    const password = String((req.body && req.body.password) || '');
    const deviceId = String((req.body && req.body.deviceId) || '').trim();

    if (!username || username.length > 64 || !password || password.length > 128) {
      return res.status(400).json({ ok: false, error: 'invalid_input' });
    }
    if (!deviceId || deviceId.length < 8) {
      return res.status(400).json({ ok: false, error: 'device_required' });
    }

    const row = await findUserByUsername(username);
    if (!row) return res.json({ ok: false, error: 'invalid_credentials' });

    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) return res.json({ ok: false, error: 'invalid_credentials' });

    if (row.expiry_date) {
      const exp = new Date(String(row.expiry_date));
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (isNaN(exp.getTime()) || today > exp) {
        return res.json({ ok: false, error: 'expired' });
      }
    }

    if (!row.is_admin) {
      const dev = await registerDevice(row.id, deviceId, row.max_devices);
      if (!dev.ok) {
        return res.json({
          ok: false,
          error: 'max_devices',
          current: dev.current,
          max: dev.max
        });
      }
    }

    const token = signToken({
      sub: row.id,
      username: row.username,
      isAdmin: !!row.is_admin
    });

    return res.json({
      ok: true,
      token: token,
      username: row.username,
      isAdmin: !!row.is_admin
    });
  } catch (e) {
    console.error('login error', e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

app.get('/api/auth/me', authMiddleware, function (req, res) {
  res.json({
    ok: true,
    username: req.user.username,
    isAdmin: !!req.user.isAdmin
  });
});

app.get('/api/users', authMiddleware, adminOnly, async function (req, res) {
  try {
    const { data, error } = await supabase
      .from('app_users')
      .select('id, username, is_admin, max_devices, expiry_date, created_at')
      .order('username', { ascending: true });
    if (error) throw error;

    const users = [];
    for (let i = 0; i < (data || []).length; i++) {
      const row = data[i];
      const deviceCount = await countDevices(row.id);
      users.push({
        username: row.username,
        isAdmin: !!row.is_admin,
        maxDevices: row.max_devices == null ? null : Number(row.max_devices),
        expiryDate: row.expiry_date || null,
        deviceCount: deviceCount,
        _source: 'supabase'
      });
    }
    res.json({ ok: true, users: users });
  } catch (e) {
    console.error('list users', e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

app.post('/api/users', authMiddleware, adminOnly, async function (req, res) {
  try {
    const username = String((req.body && req.body.username) || '').trim();
    const password = String((req.body && req.body.password) || '');
    let maxDevices = req.body && req.body.maxDevices;
    const expiryDate = (req.body && req.body.expiryDate) || null;
    const isAdmin = !!(req.body && req.body.isAdmin);

    if (!username || username.length > 64) {
      return res.status(400).json({ ok: false, error: 'invalid_username' });
    }
    if (!password || password.length < 3 || password.length > 128) {
      return res.status(400).json({ ok: false, error: 'invalid_password' });
    }
    if (maxDevices === '' || maxDevices === undefined) maxDevices = null;
    else maxDevices = Number(maxDevices);
    if (maxDevices != null && (isNaN(maxDevices) || maxDevices < 1 || maxDevices > 99)) {
      return res.status(400).json({ ok: false, error: 'invalid_max_devices' });
    }

    const existing = await findUserByUsername(username);
    if (existing) return res.status(409).json({ ok: false, error: 'username_exists' });

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const { data, error } = await supabase
      .from('app_users')
      .insert({
        username: username,
        password_hash: password_hash,
        is_admin: isAdmin,
        max_devices: maxDevices,
        expiry_date: expiryDate || null
      })
      .select('username, is_admin, max_devices, expiry_date')
      .single();
    if (error) throw error;

    res.json({
      ok: true,
      user: publicUser({
        username: data.username,
        is_admin: data.is_admin,
        max_devices: data.max_devices,
        expiry_date: data.expiry_date
      })
    });
  } catch (e) {
    console.error('create user', e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

app.put('/api/users/:username', authMiddleware, adminOnly, async function (req, res) {
  try {
    const target = String(req.params.username || '').trim();
    const row = await findUserByUsername(target);
    if (!row) return res.status(404).json({ ok: false, error: 'not_found' });

    const patch = {};
    if (req.body && req.body.password != null && String(req.body.password).length > 0) {
      const p = String(req.body.password);
      if (p.length < 3 || p.length > 128) {
        return res.status(400).json({ ok: false, error: 'invalid_password' });
      }
      patch.password_hash = await bcrypt.hash(p, BCRYPT_ROUNDS);
    }
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'maxDevices')) {
      let md = req.body.maxDevices;
      if (md === '' || md == null) patch.max_devices = null;
      else {
        md = Number(md);
        if (isNaN(md) || md < 1 || md > 99) {
          return res.status(400).json({ ok: false, error: 'invalid_max_devices' });
        }
        patch.max_devices = md;
      }
    }
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'expiryDate')) {
      patch.expiry_date = req.body.expiryDate || null;
    }
    if (req.body && typeof req.body.isAdmin === 'boolean') {
      if (row.is_admin && req.body.isAdmin === false) {
        const { count } = await supabase
          .from('app_users')
          .select('*', { count: 'exact', head: true })
          .eq('is_admin', true);
        if ((count || 0) <= 1) {
          return res.status(400).json({ ok: false, error: 'last_admin' });
        }
      }
      patch.is_admin = req.body.isAdmin;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ ok: false, error: 'nothing_to_update' });
    }

    const { data, error } = await supabase
      .from('app_users')
      .update(patch)
      .eq('id', row.id)
      .select('username, is_admin, max_devices, expiry_date')
      .single();
    if (error) throw error;

    res.json({
      ok: true,
      user: publicUser({
        username: data.username,
        is_admin: data.is_admin,
        max_devices: data.max_devices,
        expiry_date: data.expiry_date
      })
    });
  } catch (e) {
    console.error('update user', e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

app.delete('/api/users/:username', authMiddleware, adminOnly, async function (req, res) {
  try {
    const target = String(req.params.username || '').trim();
    const row = await findUserByUsername(target);
    if (!row) return res.status(404).json({ ok: false, error: 'not_found' });

    if (row.is_admin) {
      const { count } = await supabase
        .from('app_users')
        .select('*', { count: 'exact', head: true })
        .eq('is_admin', true);
      if ((count || 0) <= 1) {
        return res.status(400).json({ ok: false, error: 'last_admin' });
      }
    }
    if (String(req.user.username).toLowerCase() === String(row.username).toLowerCase()) {
      return res.status(400).json({ ok: false, error: 'cannot_delete_self' });
    }

    const { error } = await supabase.from('app_users').delete().eq('id', row.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    console.error('delete user', e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

app.post('/api/users/:username/reset-devices', authMiddleware, adminOnly, async function (req, res) {
  try {
    const target = String(req.params.username || '').trim();
    const row = await findUserByUsername(target);
    if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
    const { error } = await supabase.from('user_devices').delete().eq('user_id', row.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    console.error('reset devices', e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

async function seedMaster() {
  const u = process.env.SEED_MASTER_USERNAME || 'master';
  const p = process.env.SEED_MASTER_PASSWORD || 'master2026';
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const existing = await findUserByUsername(u);
    if (existing) {
      console.log('[seed] master sudah ada:', existing.username);
      return;
    }
    const password_hash = await bcrypt.hash(p, BCRYPT_ROUNDS);
    const { error } = await supabase.from('app_users').insert({
      username: u,
      password_hash: password_hash,
      is_admin: true,
      max_devices: null,
      expiry_date: null
    });
    if (error) throw error;
    console.log('[seed] master admin dibuat:', u);
  } catch (e) {
    console.error('[seed] gagal:', e.message || e);
  }
}

app.listen(PORT, async function () {
  console.log('MLBB Unity Tools http://localhost:' + PORT);
  await seedMaster();
});
