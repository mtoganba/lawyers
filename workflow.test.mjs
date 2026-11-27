import test from 'node:test';
import assert from 'node:assert/strict';
import { seedData, STAFF, questions, finishReview } from './core.js';
import { DEFAULT_HEAD, objectCases, queueRows, inQueueTab, searchQueue, newPacket, assignExpert, createConclusion, submitConclusion, hasConclusion } from './workflow.js';

test('этапы одного мероприятия объединяются, одинаковые названия разных мероприятий остаются разными объектами', () => {
  const records = seedData();
  const original = records[0];
  const stage3 = newPacket(records, { ...original, level: 3 });
  const groups = objectCases([...records, stage3]);
  assert.equal(groups.length, records.length);
  assert.equal(groups.find(group => group.id === original.id).stages[3].id, stage3.id);
  const other = newPacket([...records, stage3], { ...original, event: 'ДРУГОЕ-МЕРОПРИЯТИЕ', level: 2 });
  assert.equal(objectCases([...records, stage3, other]).length, records.length + 1);
});

test('мои действия определяются текущим ответственным, на доработке комплект ожидает аудитора', () => {
  const records = seedData();
  const headRows = queueRows(records, DEFAULT_HEAD);
  assert.equal(headRows.filter(row => inQueueTab(row, 'mine')).length, 1);
  const lawyerRows = queueRows(records, STAFF[0]);
  assert.equal(lawyerRows.filter(row => inQueueTab(row, 'mine')).length, 2);
  const rework = lawyerRows.find(row => row.stages[2]?.status === 'rework');
  assert.equal(inQueueTab(rework, 'auditor'), true);
  assert.equal(rework.mine, false);
  assert.equal(searchQueue(rework, 'учебный УЧЁТА'), true);
});

test('после завершения экспертизы 2 ожидается заключительный этап, завершённая экспертиза 3 закрывает строку', () => {
  const rows = queueRows(seedData());
  const main = rows.find(row => row.stages[2]?.status === 'completed');
  assert.equal(main.level, 3);
  assert.equal(main.state, 'Ожидаем аудитора');
  const final = rows.find(row => row.stages[3]?.status === 'completed');
  assert.equal(final.state, 'Завершено');
});

test('новые комплекты не наследуют дополнительные проверочные листы и не дублируют существующий этап', () => {
  const values = { name: 'Тестовый объект', bin: '000000001008', event: 'ТЕСТ-1', level: 3 };
  const packet = newPacket([], values);
  assert.deepEqual(packet.directions, []);
  assert.equal(questions(packet).length, 9);
  assert.equal(packet.assigned, '');
  assert.equal(hasConclusion(packet), false);
  assert.throws(() => newPacket([packet], values), /уже есть/);
});

test('назначение, создание и рассмотрение заключения сохраняют отдельные роли и исходные черновики', () => {
  const packet = newPacket([], { name: 'Тест', bin: '000000001008', event: 'ТЕСТ-2', level: 2 });
  assert.throws(() => assignExpert(packet, STAFF[0], STAFF[1]), /руководителю/);
  const assigned = assignExpert(packet, STAFF[0], DEFAULT_HEAD);
  assert.equal(packet.assigned, '');
  assert.throws(() => createConclusion(assigned, STAFF[1]), /назначенный юрист/);
  const draft = createConclusion(assigned, STAFF[0]);
  assert.throws(() => submitConclusion(draft, STAFF[0]), /Не проверен критерий/);
  for (const question of questions(draft)) draft.assessments[question.id] = { answer: 'yes' };
  draft.result = { outcome: 'clear', text: 'Правовая оценка завершена.', attachments: [] };
  const review = submitConclusion(draft, STAFF[0]);
  assert.equal(review.status, 'review');
  assert.equal(queueRows([review], DEFAULT_HEAD)[0].mine, true);
  assert.equal(queueRows([review], STAFF[0])[0].mine, false);
  assert.equal(finishReview(review).status, 'completed');
  assert.equal(draft.status, 'work');
});

test('замена назначенного юриста требует причину и сохраняет заполненную оценку', () => {
  const item = seedData().find(item => item.status === 'work' && item.level === 2);
  assert.throws(() => assignExpert(item, STAFF[1], DEFAULT_HEAD), /причину/);
  const next = assignExpert(item, STAFF[1], DEFAULT_HEAD, 'Перераспределение нагрузки');
  assert.deepEqual(next.assessments, item.assessments);
  assert.equal(next.history[0].author, DEFAULT_HEAD);
});
