import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';

test('HTTP: kalıcı kayıt, özel kartpostal, yönetim yetkisi ve otomatik çekiliş', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'neseli-test-'));
  let child;
  const start = async () => {
    child = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: '0', HOST: '127.0.0.1', DATA_DIR: directory, ADMIN_KEY: 'test-only-key' }, stdio: ['ignore', 'pipe', 'pipe'] });
    const port = await new Promise((resolve, reject) => {
      let output = ''; const timeout = setTimeout(() => reject(new Error('Startup timeout')), 10000);
      child.stdout.on('data', chunk => { output += chunk; const match = output.match(/Port: (\d+)/); if (match) { clearTimeout(timeout); resolve(match[1]); } });
      child.on('error', reject); child.on('exit', code => { clearTimeout(timeout); reject(new Error(`Exit ${code}`)); });
    });
    return `http://127.0.0.1:${port}`;
  };
  const stop = async () => { if (child && child.exitCode === null) { const closed = once(child, 'exit'); child.kill('SIGTERM'); await closed; } };
  t.after(async () => { await stop(); rmSync(directory, { recursive: true, force: true }); });
  let base = await start();
  const post = async (path, data) => { const response = await fetch(base + '/api/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); return { status: response.status, data: await response.json() }; };
  const page = await fetch(base); assert.match(await page.text(), /Kartpostalını açmak/);
  assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  const qr = await fetch(base + '/api/qr?url=' + encodeURIComponent('https://example.com/') + '&download=1');
  assert.equal(qr.status, 200);
  assert.equal(qr.headers.get('content-type'), 'image/png');
  assert.match(qr.headers.get('content-disposition'), /attachment/);
  assert.equal((await fetch(base + '/api/qr?url=' + encodeURIComponent('https://example.com/#k=secret'))).status, 400);
  const config = { deadline: new Date(Date.now() + 2200).toISOString(), budget: 1500 };
  assert.equal((await post('settings', { ...config, key: 'wrong' })).status, 403);
  assert.equal((await post('settings', { ...config, key: 'test-only-key' })).status, 200);
  const a = await post('register', { name: 'Deniz' }); const b = await post('register', { name: 'Ece' });
  assert.equal(a.status, 201); assert.equal(b.status, 201);
  assert.equal((await post('result', { token: a.data.token })).data.recipient, null);
  assert.equal((await post('result', { token: 'unknown' })).status, 400);
  assert.equal((await fetch(base + '/.data/admin-key')).status, 404);
  assert.equal((await fetch(base + '/api/result?token=' + a.data.token)).status, 404);
  await new Promise(resolve => setTimeout(resolve, 2300));
  assert.equal((await post('register', { name: 'Geç gelen' })).status, 400);
  const result = (await post('result', { token: a.data.token })).data;
  assert.equal(result.recipient, 'Ece');
  const status = await (await fetch(base + '/api/status')).json();
  assert.equal(status.count, 2); assert.equal(status.drawn, true); assert.ok(!('people' in status));
  await stop(); base = await start();
  assert.deepEqual((await post('result', { token: a.data.token })).data, result);
});
