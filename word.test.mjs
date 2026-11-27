import test from 'node:test';
import assert from 'node:assert/strict';
import { inflateRawSync } from 'node:zlib';
import { seedData } from './core.js';
import { conclusionModel, conclusionHtml, conclusionWord, conclusionFilename } from './print-forms.js';

function zipEntry(bytes, filename) {
  const buffer = Buffer.from(bytes);
  const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(end >= 0, 'ZIP directory must exist');
  const count = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16);
  for (let index = 0; index < count; index++) {
    assert.equal(buffer.readUInt32LE(offset), 0x02014b50);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString();
    if (name === filename) {
      const method = buffer.readUInt16LE(offset + 10);
      const length = buffer.readUInt32LE(offset + 20);
      const local = buffer.readUInt32LE(offset + 42);
      const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
      const data = buffer.subarray(start, start + length);
      return (method === 8 ? inflateRawSync(data) : data).toString('utf8');
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error(`Missing ZIP entry: ${filename}`);
}

test('предпросмотр и DOCX содержат общий вывод и замечание к нужному документу', async () => {
  const item = seedData().find(record => record.status === 'rework');
  item.result.outcome = 'remarks';
  item.result.text = 'Вывод юриста по представленным документам.';
  item.assessments.edition.npa = 'Норма <пример> & пункт 4';
  const model = conclusionModel(item, '2026-11-27T14:00:00+05:00');
  const html = conclusionHtml(model);
  assert.ok(html.includes('Вывод юриста по представленным документам.'));
  assert.ok(html.includes('Норма &lt;пример&gt; &amp; пункт 4'));
  const blob = await conclusionWord(model);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
  const xml = zipEntry(bytes, 'word/document.xml');
  assert.ok(zipEntry(bytes, '[Content_Types].xml').includes('wordprocessingml.document.main+xml'));
  for (const text of [item.name, item.event, 'Вывод юриста по представленным документам.', item.documents[0].number, 'Норма &lt;пример&gt; &amp; пункт 4']) assert.ok(xml.includes(text), text);
  assert.match(conclusionFilename(model), /\.docx$/);
});

test('незавершённая форма помечается проектом и сохраняет непроверенные критерии', () => {
  const item = seedData().find(record => record.status === 'new');
  const model = conclusionModel(item, '2026-11-27T14:00:00+05:00');
  const html = conclusionHtml(model);
  assert.equal(model.draft, true);
  assert.ok(html.includes('Проект'));
  assert.ok(html.includes('Не проверено'));
  assert.ok(html.includes('Общий вывод не выбран'));
  assert.ok(!html.includes('подписан'));
});
