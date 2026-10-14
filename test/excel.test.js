import test from 'node:test';
import assert from 'node:assert/strict';
import { unzipSync,strFromU8 } from 'fflate';
import { participantWorkbook } from '../public/excel.js';

test('Excel gerçek XLSX üretir; Türkçe/Japonca korunur ve isim formüle dönüşmez', () => {
  const output=participantWorkbook([{name:'İpek & Ayşe',created_at:'2026-10-14T10:00:00Z'},{name:'=SUM(1,1)',created_at:null},{name:'山田',created_at:null}]);
  const files=unzipSync(output); assert.ok(files['[Content_Types].xml']);assert.ok(files['xl/workbook.xml']);
  const sheet=strFromU8(files['xl/worksheets/sheet1.xml']);
  assert.match(sheet,/İpek &amp; Ayşe/);assert.match(sheet,/山田/);assert.match(sheet,/=SUM\(1,1\)/);
  assert.ok(!sheet.includes('<f>'));assert.match(sheet,/t="inlineStr"/);assert.match(sheet,/13:00/);
});
