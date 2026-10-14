import http from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { DrawStore, hash } from './store.js';
import { makeRegistrationQr } from './qr.js';

const root = dirname(fileURLToPath(import.meta.url));
const data = process.env.DATA_DIR || join(root, '.data');
mkdirSync(data, { recursive: true, mode: 0o700 });
const keyFile = join(data, 'admin-key');
if (!existsSync(keyFile)) writeFileSync(keyFile, randomBytes(32).toString('base64url'), { mode: 0o600 });
const adminHash = Buffer.from(hash(process.env.ADMIN_KEY || readFileSync(keyFile, 'utf8').trim()), 'hex');
const store = new DrawStore(join(data, 'draw.sqlite'));
const attempts = new Map();
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  const url = new URL(req.url, 'http://localhost');
  const json = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
  try {
    if (req.method === 'GET' && url.pathname === '/api/status') return json(200, store.status());
    if (req.method === 'GET' && url.pathname === '/api/qr') {
      const png = await makeRegistrationQr(url.searchParams.get('url'));
      if (url.searchParams.get('download') === '1') res.setHeader('Content-Disposition', 'attachment; filename="neseli-ofis-qr.png"');
      res.writeHead(200, { 'Content-Type': 'image/png' });
      return res.end(png);
    }
    if (req.method === 'POST' && url.pathname.startsWith('/api/')) {
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) return json(403, { error: 'Geçersiz kaynak.' });
      if (!req.headers['content-type']?.startsWith('application/json')) return json(415, { error: 'JSON gerekli.' });
      const address = req.socket.remoteAddress;
      const now = Date.now();
      const rate = attempts.get(address) || { since: now, n: 0 };
      if (now - rate.since > 60000) { rate.since = now; rate.n = 0; }
      attempts.set(address, rate);
      if (++rate.n > 120) return json(429, { error: 'Çok fazla istek. Bir dakika sonra tekrar deneyin.' });
      let text = '';
      for await (const chunk of req) { text += chunk; if (text.length > 4096) return json(413, { error: 'İstek çok büyük.' }); }
      let body;
      try { body = JSON.parse(text); } catch { return json(400, { error: 'Geçersiz JSON.' }); }
      if (!body || typeof body !== 'object') return json(400, { error: 'Geçersiz istek.' });
      if (url.pathname === '/api/register') return json(201, { token: store.register(body.name) });
      if (url.pathname === '/api/result') {
        if (typeof body.token !== 'string' || body.token.length > 100) return json(400, { error: 'Kişisel bağlantı gerekli.' });
        return json(200, store.result(body.token));
      }
      if (url.pathname === '/api/settings') {
        const supplied = Buffer.from(hash(typeof body.key === 'string' ? body.key : ''), 'hex');
        if (!timingSafeEqual(supplied, adminHash)) return json(403, { error: 'Yönetim anahtarı geçersiz.' });
        store.configure(body.deadline, body.budget);
        return json(200, store.status());
      }
      return json(404, { error: 'Bulunamadı.' });
    }
    const files = { '/': ['index.html', 'text/html'], '/yonetim': ['admin.html', 'text/html'], '/admin.html': ['admin.html', 'text/html'], '/style.css': ['style.css', 'text/css'], '/celebration.css': ['celebration.css', 'text/css'], '/app.js': ['app.js', 'text/javascript'], '/admin.js': ['admin.js', 'text/javascript'], '/i18n.js': ['i18n.js', 'text/javascript'], '/runtime.js': ['runtime.js', 'text/javascript'] };
    if (req.method === 'GET' && files[url.pathname]) {
      const [file, type] = files[url.pathname];
      res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` });
      return res.end(readFileSync(join(root, 'public', file)));
    }
    json(404, { error: 'Bulunamadı.' });
  } catch (error) { json(400, { error: error.message }); }
});
const timer = setInterval(() => { try { store.drawIfDue(); } catch (error) { console.error('Çekiliş tamamlanamadı:', error.message); } }, 1000);
timer.unref();
setInterval(() => { for (const [ip, entry] of attempts) if (Date.now() - entry.since > 60000) attempts.delete(ip); }, 60000).unref();
server.listen(Number(process.env.PORT || 3000), process.env.HOST || '0.0.0.0', () => console.log(`Yılbaşı uygulaması hazır. Port: ${server.address().port}. Yönetim anahtarı veri dizinindeki admin-key dosyasında.`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { clearInterval(timer); server.close(() => { store.close(); process.exit(0); }); });
