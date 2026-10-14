import test from 'node:test';
import assert from 'node:assert/strict';
import { DrawStore } from '../store.js';

function fixture(t) {
  let now = Date.parse('2026-12-01T10:00:00Z');
  const store = new DrawStore(':memory:', () => now);
  t.after(() => store.close());
  return { store, deadline: '2026-12-20T15:00:00Z', advance: () => { now = Date.parse('2026-12-20T15:00:00Z'); } };
}
test('tarih belirlenmeden kayıt kabul edilmez; ayarlar doğrulanır', t => {
  const { store, deadline } = fixture(t);
  assert.throws(() => store.register('Deniz'), /henüz/);
  assert.throws(() => store.configure('invalid', 100), /tarih/);
  assert.throws(() => store.configure(deadline, -1), /Bütçe/);
  store.configure(deadline, 1000);
  assert.equal(store.status().budget, 1000);
});
test('isimler kaydedilir, yinelenen kayıt engellenir ve sonuçlar erken açılmaz', t => {
  const { store, deadline } = fixture(t);
  store.configure(deadline, 1000);
  const token = store.register('  İpek   Yılmaz  ');
  assert.equal(store.status().count, 1);
  assert.deepEqual({ ...store.result(token) }, { name: 'İpek Yılmaz', recipient: null });
  assert.throws(() => store.register('ipek yılmaz'), /zaten/);
  assert.throws(() => store.result('invalid'), /geçersiz/);
  assert.ok(!JSON.stringify(store.status()).includes('İpek'));
  assert.notEqual(store.db.prepare('SELECT token FROM people').get().token, token);
});
test('tam kapanış anında kayıt kapanır, herkes tek bir başkasını çeker ve sonuç sabittir', t => {
  const { store, deadline, advance } = fixture(t);
  store.configure(deadline, 1000);
  const tokens = Array.from({ length: 30 }, (_, i) => store.register(`Katılımcı ${i}`));
  advance();
  assert.throws(() => store.register('Geç kalan'), /sona erdi/);
  assert.equal(store.status().drawn, true);
  const results = tokens.map(token => store.result(token));
  assert.equal(new Set(results.map(r => r.recipient)).size, 30);
  for (const result of results) assert.notEqual(result.name, result.recipient);
  assert.deepEqual(tokens.map(token => store.result(token)), results);
  assert.throws(() => store.configure('2027-12-25', 2000), /değiştirilemez/);
});
test('iki kişi birbirini çeker; tek kişide sonuç üretilmez', t => {
  const { store, deadline, advance } = fixture(t);
  store.configure(deadline, 1000);
  const a = store.register('Ada'); const b = store.register('Ege');
  advance(); assert.equal(store.result(a).recipient, 'Ege'); assert.equal(store.result(b).recipient, 'Ada');
  const single = new DrawStore(':memory:', () => Date.parse('2026-12-01'));
  t.after(() => single.close()); single.configure(deadline, 100); single.register('Tek kişi');
  single.clock = () => Date.parse('2027-01-01');
  assert.equal(single.status().drawn, false);
});
