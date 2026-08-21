/**
 * Serve tool scripts only to authenticated users.
 * Paths are intentionally non-descriptive.
 *
 * GET /api/x/1  → hero-viewer.js
 * GET /api/x/2  → document-extractor.js
 * GET /api/x/3  → gameobject-overrider.js
 */
const fs = require('fs');
const path = require('path');
const { getBearerToken, verifyToken } = require('../lib/session');

const TOOL_MAP = {
  '1': 'hero-viewer.js',
  '2': 'document-extractor.js',
  '3': 'gameobject-overrider.js'
};

const toolsDir = path.join(__dirname, '..', 'tools');

module.exports = function handler(req, res) {
  // CORS preflight
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

  // Require valid session token
  const token = getBearerToken(req);
  const sess = verifyToken(token);
  if (!sess) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, message: 'Unauthorized' }));
    return;
  }

  // Extract id from URL: /api/x/1 or /api/x/1.js etc.
  const urlPath = (req.url || '').split('?')[0];
  const m = urlPath.match(/\/(?:api\/)?x\/([123])(?:\.js)?\/?$/i) ||
            urlPath.match(/\/([123])(?:\.js)?\/?$/);
  const id = m ? m[1] : null;
  const fileName = id && TOOL_MAP[id];

  if (!fileName) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, message: 'Not found' }));
    return;
  }

  const filePath = path.join(toolsDir, fileName);
  if (!fs.existsSync(filePath)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, message: 'Not found' }));
    return;
  }

  // Serve as JS, discourage caching & path guessing
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', 'inline; filename="t.js"'); // generic name
  res.statusCode = 200;
  fs.createReadStream(filePath).pipe(res);
};
