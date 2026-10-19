import test from 'node:test';
import assert from 'node:assert/strict';
import { DrawStore } from '../store.js';

function fixture(t) {
  let now = Date.parse('2026-12-01T10:00:00Z');
  const store = new DrawStore(':memory:', () => now);
  t.after(() => store.close());
  return { store, deadline: '2026-12-20T15:00:00Z', advance: () => { now = Date.parse('2026-12-20T15:00:00Z'); } };
}
test('kapanmış deneme yeniden açılır; isimler ve tokenlar korunur, sonuçlar temizlenir', t => {
  const {store,deadline,advance}=fixture(t); store.configure(deadline,1000);
  const tokens=['Ada','Ece','Deniz'].map(name=>store.register(name));
  advance(); assert.equal(store.status().drawn,true);
  const original=store.participants().participants;
  assert.throws(()=>store.reopen(deadline,2000),/Gelecekte/);
  assert.throws(()=>store.reopen('2027-01-01',0),/Bütçe/);
  assert.equal(store.status().drawn,true,'Invalid settings must not revoke results');
  assert.ok(store.result(tokens[0]).recipient);
  const reopened=store.reopen('2027-01-01T10:00:00Z',2000);
  assert.equal(reopened.drawn,false); assert.equal(reopened.count,3);
  assert.deepEqual(store.participants().participants,original);
  for(const token of tokens) assert.equal(store.result(token).recipient,null);
  store.register('Yeni kişi');
  store.clock=()=>Date.parse('2027-01-01T10:00:00Z');
  assert.equal(store.status().drawn,true);
  for(const token of tokens) assert.notEqual(store.result(token).name,store.result(token).recipient);
});
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

test('yönetici silmesi tokenı geçersiz kılar; kapanış ve çekilişten sonra silinemez', t => {
  const {store,deadline,advance}=fixture(t); store.configure(deadline,1000);
  const token=store.register('Silinecek kişi');const other=store.register('Kalacak kişi');
  const list=store.participants();assert.equal(list.canDelete,true);assert.equal(list.participants.length,2);
  assert.ok(!JSON.stringify(list).includes(token));assert.ok(!('token' in list.participants[0]));
  store.deleteRegistration(list.participants[0].id);
  assert.throws(()=>store.result(token),/geçersiz/);assert.equal(store.status().count,1);assert.equal(store.result(other).name,'Kalacak kişi');
  store.register('Silinecek kişi');assert.throws(()=>store.deleteRegistration(9999),/bulunamadı/);
  advance();assert.throws(()=>store.deleteRegistration(store.participants().participants[0].id),/silme yapılamaz/);
  assert.equal(store.participants().canDelete,false);assert.equal(store.status().drawn,true);
});
