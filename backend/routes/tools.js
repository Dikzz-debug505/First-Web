/**
 * Serve tool scripts only to authenticated users.
 * Paths are intentionally non-descriptive.
 *
 * GET /api/x/1  → hero-viewer.js
 * GET /api/x/2  → document-extractor.js
 * GET /api/x/3  → gameobject-overrider.js
 * GET /api/x/4  → python-encryptor.js
 * GET /api/x/5  → xxh-patcher.js
 */
const fs = require('fs');
const path = require('path');
const { getBearerToken, verifyToken } = require('../lib/session');

const TOOL_MAP = {
  '1': 'hero-viewer.js',
  '2': 'document-extractor.js',
  '3': 'gameobject-overrider.js',
  '4': 'python-encryptor.js',
  '5': 'xxh-patcher.js'
};

/** Resolve tool file across local / Vercel layouts */
function resolveToolPath(fileName) {
  const candidates = [
    path.join(__dirname, '..', 'tools', fileName),
    path.join(process.cwd(), 'backend', 'tools', fileName),
    path.join(process.cwd(), 'tools', fileName),
    // static fallback copies (same source)
    path.join(process.cwd(), 'frontend', 'js', 'tools', fileName
      .replace('hero-viewer.js', '1.js')
      .replace('document-extractor.js', '2.js')
      .replace('gameobject-overrider.js', '3.js')
      .replace('python-encryptor.js', '4.js')
      .replace('xxh-patcher.js', '5.js')),
    path.join(__dirname, '..', '..', 'frontend', 'js', 'tools', ({
      'hero-viewer.js': '1.js',
      'document-extractor.js': '2.js',
      'gameobject-overrider.js': '3.js',
      'python-encryptor.js': '4.js',
      'xxh-patcher.js': '5.js'
    })[fileName] || fileName)
  ];
  for (let i = 0; i < candidates.length; i++) {
    try {
      if (candidates[i] && fs.existsSync(candidates[i])) return candidates[i];
    } catch (_) {}
  }
  return null;
}

module.exports = function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, message: 'Method not allowed' }));
    return;
  }

  const token = getBearerToken(req);
  const sess = verifyToken(token);
  if (!sess) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, message: 'Unauthorized' }));
    return;
  }

  const urlPath = (req.url || '').split('?')[0];
  const m = urlPath.match(/\/(?:api\/)?x\/([1-5])(?:\.js)?\/?$/i) ||
            urlPath.match(/\/([1-5])(?:\.js)?\/?$/);
  const id = m ? m[1] : null;
  const fileName = id && TOOL_MAP[id];

  if (!fileName) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, message: 'Not found' }));
    return;
  }

  const filePath = resolveToolPath(fileName);
  if (!filePath) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, message: 'Tool file missing on server' }));
    return;
  }

  let code;
  try {
    code = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, message: 'Failed to read tool' }));
    return;
  }

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.statusCode = 200;
  res.end(code);
};
