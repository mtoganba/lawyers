import test from 'node:test';
import assert from 'node:assert/strict';
import { seedData, questionGroups, questions, progress, finishReview, resubmit, completionErrors } from './core.js';

function reviewedItem() {
  const item = seedData().find(i => i.status === 'work' && i.level === 2);
  for (const q of questions(item)) item.assessments[q.id] = { answer: 'yes' };
  item.result = { outcome: 'clear', text: 'Проверка завершена по представленным материалам.', attachments: [] };
  return item;
}

test('завершение блокируется, если остался непроверенный критерий', () => {
  const item = reviewedItem();
  delete item.assessments.edition;
  assert.throws(() => finishReview(item), /Не проверен критерий/);
  assert.equal(item.status, 'work');
});

test('неприменимый критерий требует пояснения и учитывается в прогрессе', () => {
  const item = reviewedItem();
  item.assessments.evidence = { answer: 'na' };
  assert.equal(progress(item).reviewed, progress(item).total);
  assert.throws(() => finishReview(item), /причину неприменимости/);
  item.assessments.evidence.comment = 'Не относится к представленным материалам.';
  assert.equal(finishReview(item).status, 'completed');
});

test('замечание не позволяет автоматически оформить вывод без замечаний', () => {
  const item = reviewedItem();
  item.assessments.edition = { answer: 'issue', documentId: 'report', point: '4', comment: 'Требуется уточнить редакцию нормы.', npa: 'НПА, статья, пункт.', recommendation: 'Уточнить правовую ссылку.' };
  assert.throws(() => finishReview(item), /выберите вывод «С замечаниями»/);
  item.result.outcome = 'remarks';
  assert.equal(finishReview(item).status, 'completed');
});

test('замечание ссылается на документ из проверяемого комплекта', () => {
  const item = reviewedItem();
  item.result.outcome = 'remarks';
  item.assessments.edition = { answer: 'issue', documentId: 'unknown-document', point: '4', comment: 'Замечание.', npa: 'Норма.', recommendation: 'Исправление.' };
  assert.ok(completionErrors(item).some(message => /Заполните документ/.test(message)));
});

test('повторная передача сохраняет прежние замечания и версии без перезаписи', () => {
  const original = seedData().find(i => i.status === 'rework');
  const next = resubmit(original, '2026-11-27T13:00:00+05:00');
  assert.equal(next.iteration, 2);
  assert.equal(next.documents[0].version, 2);
  assert.equal(next.versions[0].documents[0].version, 1);
  assert.deepEqual(next.versions[0].directions, original.directions);
  assert.equal(next.versions[0].assessments.edition.comment, original.assessments.edition.comment);
  assert.deepEqual(next.assessments, {});
  next.versions[0].assessments.edition.comment = 'Изменённая копия';
  assert.notEqual(original.assessments.edition.comment, 'Изменённая копия');
  assert.equal(original.status, 'rework');
});

test('результат завершения сохраняет явный вывод юриста и автора', () => {
  const item = reviewedItem();
  const next = finishReview(item, '2026-11-27T14:00:00+05:00');
  assert.equal(next.result.outcome, 'clear');
  assert.equal(next.history[0].author, item.assigned);
  assert.equal(next.completedAt, '2026-11-27T14:00:00+05:00');
  assert.equal(item.status, 'work');
});

test('сохранённая карточка с отключённым направлением сохраняет остальные оценки', () => {
  const item = seedData().find(i => i.status === 'work' && i.level === 2);
  item.directions = ['procurement', 'budget'];
  item.assessments = {
    scope: { answer: 'yes' },
    'proc-contract': { answer: 'issue', comment: 'Сохранённый черновик' }
  };
  const oldAnswers = structuredClone(item.assessments);
  assert.deepEqual(questionGroups(item).map(group => group.id), ['common', 'budget']);
  assert.deepEqual(progress(item), { total: 8, reviewed: 1, issues: 0 });
  assert.deepEqual(item.assessments, oldAnswers);
});

