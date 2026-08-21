/**
 * Local Full-Stack server (Express)
 * Usage: npm run dev  →  http://localhost:3000
 *
 * Production on Vercel uses /api/* serverless handlers instead.
 */
const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '256kb' }));

// Security-ish headers (mirip _headers)
app.use(function (req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

// ---- API routes (same handlers as Vercel serverless) ----
function mount(handler) {
  return function (req, res) {
    // Express req/res compatible enough for our handlers
    return handler(req, res);
  };
}

app.options('/api/login', mount(require('./routes/login')));
app.post('/api/login', mount(require('./routes/login')));

app.options('/api/maintenance', mount(require('./routes/maintenance')));
app.get('/api/maintenance', mount(require('./routes/maintenance')));

app.options('/api/admin/users', mount(require('./routes/admin/users')));
app.get('/api/admin/users', mount(require('./routes/admin/users')));
app.post('/api/admin/users', mount(require('./routes/admin/users')));

app.options('/api/admin/delete-user', mount(require('./routes/admin/delete-user')));
app.post('/api/admin/delete-user', mount(require('./routes/admin/delete-user')));

app.options('/api/admin/reset-device', mount(require('./routes/admin/reset-device')));
app.post('/api/admin/reset-device', mount(require('./routes/admin/reset-device')));

app.options('/api/admin/maintenance', mount(require('./routes/admin/maintenance')));
app.get('/api/admin/maintenance', mount(require('./routes/admin/maintenance')));
app.post('/api/admin/maintenance', mount(require('./routes/admin/maintenance')));

// ---- Frontend static ----
const frontendDir = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendDir, {
  etag: true,
  setHeaders: function (res, filePath) {
    if (/\.(html|js)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  }
}));

// SPA fallback
app.get('*', function (req, res) {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

app.listen(PORT, function () {
  console.log('MLBB Unity Tools — Full Stack');
  console.log('  Frontend : http://localhost:' + PORT);
  console.log('  API      : http://localhost:' + PORT + '/api/*');
  console.log('  Env      : SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
});
