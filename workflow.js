import { STAFF, progress, completionErrors, seedData } from './core.js?v=vga-1';

export const DEFAULT_HEAD = 'Ахметова Алия Маратовна';
export const ACTORS = [
  { name: DEFAULT_HEAD, role: 'Руководитель правового подразделения' },
  ...STAFF.map(name => ({ name, role: 'Юрист' }))
];
export const QUEUE_TABS = {
  mine: { title: 'Мои действия', description: 'Объекты и этапы, по которым действие требуется от вашей учётной записи.', emptyTitle: 'Сейчас от вас не требуется действие', emptyText: 'Здесь появятся объекты, когда вам потребуется назначить юриста, подготовить или рассмотреть заключение.' },
  legal: { title: 'В работе ЮЭ', description: 'Переданные комплекты: назначение юриста, подготовка и рассмотрение заключений.', emptyTitle: 'В работе ЮЭ пока нет комплектов', emptyText: 'Комплект появится после передачи аудитором на юридическую экспертизу.' },
  auditor: { title: 'Ожидаем аудитора', description: 'Материалы готовятся, ожидают передачи на юридическую экспертизу или исправления замечаний.', emptyTitle: 'Нет объектов, ожидающих аудитора', emptyText: 'Здесь появятся объекты, по которым аудитор готовит материалы или исправляет замечания.' },
  all: { title: 'Все объекты', description: 'Текущий шаг по каждому объекту. Юридическая экспертиза 2 и 3 доступны внутри объекта.', emptyTitle: 'Объекты не найдены', emptyText: 'Объекты появятся после поступления аудиторских мероприятий.' }
};
export const hasConclusion = item => Boolean(item && (item.conclusionCreated ?? (Object.keys(item.assessments).length || item.result.outcome || item.result.text || ['completed', 'rework', 'review'].includes(item.status))));
export const headOf = item => item?.head || DEFAULT_HEAD;
export const objectKey = item => `${String(item.bin || '').trim()}|${String(item.event || '').trim()}`;

export function objectCases(records) {
  const groups = new Map();
  for (const item of records) {
    const key = objectKey(item);
    if (!groups.has(key)) groups.set(key, { id: item.id, key, name: item.name, bin: item.bin, event: item.event, purpose: item.purpose || '', stages: {} });
    const object = groups.get(key);
    if (!object.stages[item.level]) object.stages[item.level] = item;
  }
  return [...groups.values()];
}

export function stageStep(item, level, actor = '') {
  const result = { level, item, tone: 'waiting', state: 'Ожидаем аудитора', step: 'Аудитор готовит материалы', detail: level === 2 ? 'Ожидается передача отчёта и реестра нарушений' : 'Ожидается передача итоговых документов', responsible: item?.auditor || 'Аудитор', mine: false };
  if (!item) return result;
  if (item.status === 'completed') return { ...result, tone: 'done', state: 'Завершено', step: 'Юридическая экспертиза завершена', detail: '', responsible: '—' };
  if (item.status === 'rework') return { ...result, step: 'Аудитор устраняет замечания', detail: 'Ожидается исправленный комплект документов' };
  if (item.status === 'review') return { ...result, tone: 'working', state: 'В работе ЮЭ', step: 'Рассмотрение заключения', detail: 'Заключение направлено руководителю правового подразделения', responsible: headOf(item), mine: headOf(item) === actor };
  if (!item.assigned) return { ...result, tone: 'working', state: 'В работе ЮЭ', step: 'Назначить юриста', detail: 'Руководитель назначает ответственного юриста на этап', responsible: headOf(item), mine: headOf(item) === actor };
  const p = progress(item);
  return { ...result, tone: 'working', state: 'В работе ЮЭ', step: 'Юрист готовит заключение', detail: hasConclusion(item) ? `Проверено ${p.reviewed} из ${p.total} критериев. Подготовьте выводы и рекомендации` : 'Создайте юридическое заключение по переданному комплекту', responsible: item.assigned, mine: item.assigned === actor };
}

export function queueRows(records, actor = '') {
  return objectCases(records).map(object => {
    const stages = [object.stages[2], object.stages[3]].filter(Boolean);
    const pending = stages.find(item => item.status !== 'completed');
    // Этап 3 ещё ожидается после завершения экспертизы 2. Если заключительный этап
    // завершён, строка завершена; отсутствие сведений об этапе 2 не создаёт фиктивного заключения.
    const row = pending ? stageStep(pending, pending.level, actor) : object.stages[3] ? stageStep(object.stages[3], 3, actor) : stageStep(null, 3, actor);
    if (!pending && !object.stages[3]) row.responsible = object.stages[2]?.auditor || 'Аудитор';
    return { ...object, ...row };
  });
}
export const inQueueTab = (row, tab) => tab === 'all' || (tab === 'mine' && row.mine) || (tab === 'legal' && row.tone === 'working') || (tab === 'auditor' && row.tone === 'waiting');
const normalize = text => String(text || '').toLocaleLowerCase('ru').replaceAll('ё', 'е');
export function searchQueue(row, query) {
  const haystack = normalize([row.name, row.bin, row.event, row.responsible, row.step, ...Object.values(row.stages).map(item => item.id)].join(' '));
  return normalize(query).trim().split(/\s+/).filter(Boolean).every(word => haystack.includes(word));
}

export function newPacket(records, values, now = new Date().toISOString()) {
  const level = Number(values.level);
  if (![2, 3].includes(level) || !values.name?.trim() || !/^\d{12}$/.test(values.bin) || !values.event?.trim()) throw new Error('Укажите уровень, наименование, БИН из 12 цифр и номер мероприятия.');
  if (records.some(item => objectKey(item) === objectKey(values) && item.level === level)) throw new Error('Комплект этого этапа уже есть у объекта. Откройте существующую экспертизу.');
  const template = structuredClone(seedData().find(item => item.level === level));
  const num = Math.max(12, ...records.map(item => Number(item.id.split('-').at(-1))).filter(Number.isFinite)) + 1;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Oral' }).format(new Date(now));
  Object.assign(template, { id: `ЮЭ-2026-${String(num).padStart(4, '0')}`, name: values.name.trim(), bin: values.bin, event: values.event.trim(), purpose: values.purpose || '', head: values.head || DEFAULT_HEAD, level, status: 'new', assigned: '', received: today, due: '', directions: [], assessments: {}, result: { outcome: '', text: '', attachments: [] }, versions: [], iteration: 1, conclusionCreated: false, history: [{ time: now, action: 'Комплект поступил на юридическую экспертизу', detail: `Юридическая экспертиза ${level} · демонстрация передачи из ВГА`, author: 'ВГА · демонстрация' }] });
  template.documents = template.documents.map(doc => ({ ...doc, number: doc.number.replace(/30101-26-[^\s]+/, template.event), date: today, version: 1 }));
  delete template.completedAt;
  return template;
}

export function assignExpert(item, name, actor, reason = '', now = new Date().toISOString()) {
  if (actor !== headOf(item)) throw new Error('Назначение доступно руководителю юридической экспертизы этого этапа.');
  if (['completed', 'review', 'rework'].includes(item.status)) throw new Error('Сейчас замена юриста недоступна.');
  if (!STAFF.includes(name) || name === item.assigned) throw new Error('Выберите другого ответственного юриста.');
  if (item.assigned && !reason.trim()) throw new Error('Укажите причину замены юриста.');
  const next = structuredClone(item);
  next.assigned = name; next.status = 'work';
  next.history.unshift({ time: now, action: item.assigned ? 'Заменён ответственный юрист' : 'Назначен ответственный юрист', detail: `${name}${reason ? `. Причина: ${reason.trim()}` : ''}`, author: actor });
  return next;
}
export function createConclusion(item, actor, now = new Date().toISOString()) {
  if (actor !== item.assigned || item.status !== 'work' || hasConclusion(item)) throw new Error('Создать заключение может назначенный юрист по полученному комплекту.');
  const next = structuredClone(item);
  next.conclusionCreated = true; next.conclusionDate = now;
  next.history.unshift({ time: now, action: 'Создан проект юридического заключения', detail: `Передача комплекта ${item.iteration}`, author: actor });
  return next;
}
export function submitConclusion(item, actor, now = new Date().toISOString()) {
  if (actor !== item.assigned || item.status !== 'work' || !hasConclusion(item)) throw new Error('Направить заключение может ответственный юрист.');
  const errors = completionErrors(item);
  if (errors.length) throw new Error(errors.join('\n'));
  const next = structuredClone(item);
  next.status = 'review';
  next.history.unshift({ time: now, action: 'Заключение направлено на рассмотрение', detail: headOf(item), author: actor });
  return next;
}
