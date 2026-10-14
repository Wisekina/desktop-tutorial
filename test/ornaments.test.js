import test from 'node:test';
import assert from 'node:assert/strict';
import { ornamentLayout, branchWidth } from '../public/ornaments.js';

test('süsler katılımcı sayısına göre dalların içine sığar ve çakışmaz', () => {
  for (const count of [1, 20, 25, 30, 50, 100, 200, 500]) {
    const positions = ornamentLayout(count);
    assert.equal(positions.length, count);
    for (let i = 0; i < positions.length; i++) {
      const a = positions[i];
      assert.ok(Math.abs(a.x - 250) + a.r <= branchWidth(a.y));
      assert.ok(a.y - a.r >= 168 && a.y + a.r <= 452);
      for (let j = i + 1; j < positions.length; j++) {
        const b = positions[j];
        assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > a.r + b.r, `${count} participants: ornaments overlap`);
      }
    }
  }
  assert.ok(ornamentLayout(500)[0].r < ornamentLayout(30)[0].r);
  assert.deepEqual(ornamentLayout(0), []);
  const twentyFive = ornamentLayout(25);
  assert.ok(Math.max(...twentyFive.map(p => p.y)) - Math.min(...twentyFive.map(p => p.y)) > 200);
});
