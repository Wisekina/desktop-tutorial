import test from 'node:test';
import assert from 'node:assert/strict';
import { registrationUrl, makeRegistrationQr } from '../qr.js';

test('ortak QR yalnızca HTTPS ana adresini taşır; kişisel sonuç ve yerel adres reddedilir', () => {
  assert.equal(registrationUrl('https://example.com'), 'https://example.com/');
  for (const url of ['http://example.com', 'https://localhost', 'https://127.0.0.1', 'https://example.com/#k=private', 'https://example.com/?token=secret', 'https://example.com/yonetim', 'https://user:password@example.com', 'not a url']) {
    assert.throws(() => registrationUrl(url));
  }
});

test('indirilebilir QR görseli geçerli PNG olarak oluşturulur', async () => {
  const image = await makeRegistrationQr('https://example.com/');
  assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(image.readUInt32BE(16), 720);
  assert.equal(image.readUInt32BE(20), 720);
});
