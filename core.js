export const STAFF = ['Ермекова Алия Сериковна', 'Садыков Данияр Маратович', 'Толеубаева Динара Муратовна'];
export const STATUS = { new: 'Новая', work: 'В работе', rework: 'На доработке', completed: 'Завершена' };
export const ANSWERS = { yes: 'Соответствует', issue: 'Есть замечания', na: 'Не применимо', pending: 'Не проверено' };
export const DIRECTIONS = { procurement: 'Государственные закупки', budget: 'Бюджетное законодательство', accounting: 'Бухгалтерский учёт' };
export const OUTCOMES = { clear: 'Без замечаний', remarks: 'С замечаниями', revised: 'Замечания устранены' };

const common = [
  { id: 'scope', title: 'Применимость правовой нормы', text: 'Указанная норма относится к рассматриваемым обстоятельствам и предмету аудита.' },
  { id: 'edition', title: 'Редакция законодательства', text: 'Учтена редакция правовой нормы, действовавшая на дату рассматриваемого события.' },
  { id: 'grounds', title: 'Правовое обоснование выводов', text: 'Выводы аудитора обоснованы ссылками на конкретные положения НПА.' },
  { id: 'evidence', title: 'Подтверждающие документы', text: 'Материалы комплекта позволяют обосновать правовые выводы по указанным нарушениям.' },
  { id: 'qualification', title: 'Квалификация нарушений', text: 'Правовая квалификация согласуется с обстоятельствами, изложенными в документах.' }
];
const directions = {
  procurement: [
    { id: 'proc-scope', title: 'Применимость законодательства о закупках', text: 'Определено применимое регулирование с учётом предмета, способа и даты закупки.' },
    { id: 'proc-contract', title: 'Обоснование замечаний к закупке', text: 'Замечания к процедуре закупки и исполнению договора обоснованы материалами и нормами права.' },
    { id: 'proc-measures', title: 'Предлагаемые правовые меры', text: 'Предлагаемые меры связаны с установленными обстоятельствами и имеют правовое обоснование.' }
  ],
  budget: [
    { id: 'bud-norm', title: 'Применимость бюджетных норм', text: 'В выводах корректно определены применимые нормы бюджетного законодательства.' },
    { id: 'bud-funds', title: 'Обоснование выводов об использовании средств', text: 'Правовые выводы об использовании средств согласуются с материалами проверки.' },
    { id: 'bud-measures', title: 'Обоснование предложенных мер', text: 'Требования и рекомендации имеют правовое обоснование и связаны с выявленными фактами.' }
  ],
  accounting: [
    { id: 'acc-norm', title: 'Применимость правил учёта', text: 'Определены правила учёта и отчётности, применимые к объекту и проверяемому периоду.' },
    { id: 'acc-doc', title: 'Документальное обоснование', text: 'Правовые выводы согласуются с первичными документами и материалами аудита.' },
    { id: 'acc-measures', title: 'Обоснование корректирующих мер', text: 'Предложенные меры по исправлению учёта имеют правовое обоснование.' }
  ]
};
const finalChecks = [
  { id: 'final-consistency', title: 'Согласованность итоговых документов', text: 'Выводы аудиторского заключения и предписания согласуются с материалами мероприятия.' },
  { id: 'final-recommendations', title: 'Рекомендации и требования', text: 'Рекомендации и требования сформулированы определённо и имеют правовое обоснование.' },
  { id: 'final-addressee', title: 'Адресат предписания', text: 'Проверены адресат предписания и его связь с установленными обстоятельствами.' },
  { id: 'final-previous', title: 'Учёт предыдущей экспертизы', text: 'Проверено, как учтены замечания юридической экспертизы 2, если она проводилась.' }
];

export function questionGroups(item) {
  const groups = [{ id: 'common', title: 'Общая правовая оценка', questions: common }];
  for (const id of item.directions) groups.push({ id, title: DIRECTIONS[id], questions: directions[id] });
  if (item.level === 3) groups.push({ id: 'final', title: 'Итоговые документы', questions: finalChecks });
  return groups;
}
export function questions(item) { return questionGroups(item).flatMap(g => g.questions); }
export function progress(item) {
  const list = questions(item);
  return { total: list.length, reviewed: list.filter(q => item.assessments[q.id]?.answer && item.assessments[q.id].answer !== 'pending').length, issues: list.filter(q => item.assessments[q.id]?.answer === 'issue').length };
}
export function findings(item) {
  return questions(item).filter(q => item.assessments[q.id]?.answer === 'issue').map(q => ({ ...q, ...item.assessments[q.id] }));
}
export function assessmentErrors(item) {
  const errors = [];
  for (const q of questions(item)) {
    const a = item.assessments[q.id];
    if (!a || !a.answer || a.answer === 'pending') { errors.push(`Не проверен критерий «${q.title}».`); continue; }
    if (!['yes', 'issue', 'na'].includes(a.answer)) { errors.push(`Выберите ответ для критерия «${q.title}».`); continue; }
    if (a.answer === 'issue') {
      if (!a.comment?.trim() || !a.npa?.trim() || !a.recommendation?.trim() || !a.point?.trim() || !item.documents.some(d => d.id === a.documentId)) errors.push(`Заполните документ, пункт, замечание, норму НПА и рекомендацию: «${q.title}».`);
    }
    if (a.answer === 'na' && !a.comment?.trim()) errors.push(`Укажите причину неприменимости: «${q.title}».`);
  }
  return errors;
}
export function completionErrors(item) {
  const errors = assessmentErrors(item);
  if (!item.assigned) errors.unshift('Назначьте исполнителя экспертизы.');
  if (!OUTCOMES[item.result.outcome]) errors.push('Выберите общий вывод.');
  if (!item.result.text?.trim()) errors.push('Заполните обоснование общего вывода.');
  if (findings(item).length && ['clear', 'revised'].includes(item.result.outcome)) errors.push('В проверочном листе есть замечания. Устраните их или выберите вывод «С замечаниями».');
  return errors;
}
export function finishReview(item, now = new Date().toISOString()) {
  const errors = completionErrors(item);
  if (errors.length) throw new Error(errors.join('\n'));
  const next = structuredClone(item);
  next.status = 'completed'; next.completedAt = now;
  next.history.unshift({ time: now, action: 'Экспертиза завершена', detail: OUTCOMES[next.result.outcome], author: next.assigned });
  return next;
}
export function resubmit(item, now = new Date().toISOString()) {
  if (item.status !== 'rework') throw new Error('Повторная передача доступна для комплекта на доработке.');
  const next = structuredClone(item);
  next.versions.unshift({ number: item.iteration, time: now, directions: structuredClone(item.directions), documents: structuredClone(item.documents), assessments: structuredClone(item.assessments), result: structuredClone(item.result) });
  next.iteration += 1;
  next.documents = next.documents.map(d => ({ ...d, version: d.version + 1, date: now.slice(0, 10) }));
  next.assessments = {}; next.result = { outcome: '', text: '', attachments: [] };
  next.status = 'work';
  next.history.unshift({ time: now, action: 'Получен исправленный комплект', detail: `Повторная проверка · передача ${next.iteration}`, author: 'Аудитор · демонстрация' });
  return next;
}
export function seedData() {
  const rows = [
    ['0012', 2, 'new', 'ГУ «Учебный центр государственных закупок»', '000000001002', '30101-26-00003-ТА', '2026-11-27', '2026-12-03', '', ['procurement']],
    ['0011', 3, 'work', 'ГУ «Центр развития городской инфраструктуры»', '000000001003', '30101-26-00018-ТА', '2026-11-26', '2026-11-30', STAFF[0], ['budget']],
    ['0010', 2, 'rework', 'ГУ «Учебный центр бухгалтерского учёта»', '000000001004', '30101-26-00002-ЭА', '2026-11-25', '2026-12-01', STAFF[2], ['accounting']],
    ['0009', 2, 'work', 'АО «Региональная сервисная компания»', '000000001005', '30101-26-00012-ТА', '2026-11-24', '2026-11-27', STAFF[0], ['procurement']],
    ['0008', 3, 'completed', 'ГУ «Центр образовательных программ»', '000000001006', '30101-26-00011-ТА', '2026-11-23', '2026-11-26', STAFF[1], ['budget']],
    ['0007', 2, 'completed', 'ГУ «Учебный центр инфраструктуры»', '000000001007', '30101-26-00009-ЭА', '2026-11-20', '2026-11-25', STAFF[0], ['procurement']]
  ];
  return rows.map(([num, level, status, name, bin, event, received, due, assigned, dirs]) => {
    const id = `ЮЭ-2026-${num}`;
    const specs = level === 2 ? [['report', 'Аудиторский отчёт', `АО-${event}`, 'Основной документ'], ['register', 'Реестр нарушений', `РН-${event}`, 'Приложение'], ['proof', 'Аудиторские доказательства', `${event}/02`, 'Подтверждающие материалы']] : [['conclusion', 'Аудиторское заключение', `АЗ-${event}`, 'Основной документ'], ['instruction', 'Предписание на устранение нарушений', `П-${event}`, 'Итоговый документ'], ['summary', 'Сводный реестр нарушений', `СР-${event}`, 'Приложение']];
    const item = { id, level, status, name, bin, event, received, due, assigned, directions: dirs, iteration: 1, auditor: 'Жукенов Каримжан Амангельдыевич', assessments: {}, result: { outcome: '', text: '', attachments: [] }, documents: specs.map(([docId, title, number, kind]) => ({ id: docId, title, number, kind, version: 1, date: received })), history: [{ time: `${received}T09:00:00+05:00`, action: 'Комплект поступил на юридическую экспертизу', detail: `Основных документов: ${specs.length}`, author: 'ВГА · демонстрация' }], versions: [] };
    if (status !== 'new') item.history.unshift({ time: `${received}T10:15:00+05:00`, action: 'Назначен исполнитель', detail: assigned, author: 'Руководитель правового подразделения' });
    if (status === 'rework') {
      item.assessments.edition = { answer: 'issue', documentId: 'report', point: '4', comment: 'В тексте приведена ссылка без указания редакции нормы на дату события. Требуется уточнить правовое обоснование.', npa: 'Применимый НПА: уточнить редакцию и конкретный пункт.', recommendation: 'Уточнить реквизиты и редакцию нормы, проверить правовое обоснование вывода.', auditorReply: 'Ссылка уточняется. Исправленный комплект будет направлен повторно.' };
      item.history.unshift({ time: '2026-11-26T12:30:00+05:00', action: 'Направлены замечания аудитору', detail: 'Требуется уточнить правовое обоснование по пункту 4.', author: assigned });
    }
    if (status === 'completed') {
      for (const q of questions(item)) item.assessments[q.id] = { answer: 'yes' };
      item.result.outcome = 'clear'; item.result.text = 'По представленному демонстрационному комплекту замечания в рамках выбранных критериев не зафиксированы.';
      item.completedAt = `${due}T11:00:00+05:00`;
      item.history.unshift({ time: item.completedAt, action: 'Экспертиза завершена', detail: 'Без замечаний', author: assigned });
    }
    if (num === '0009') for (const q of common.slice(0, 2)) item.assessments[q.id] = { answer: 'yes' };
    return item;
  });
}
