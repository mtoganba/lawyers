import { STAFF, STATUS, ANSWERS, DIRECTIONS, OUTCOMES, seedData, questionGroups, questions, progress, findings, assessmentErrors, completionErrors, finishReview, resubmit } from './core.js?v=f7ab02b';

const paths = {
  scale: '<path d="M12 3v17m-5 1h10M5 7h14M6 7l-4 8h8L6 7Zm12 0-4 8h8l-4-8Z"/>',
  checklist: '<rect x="5" y="3" width="15" height="19" rx="2"/><path d="m8 8 1 1 2-2m2 1h4m-9 5 1 1 2-2m2 1h4m-9 5h9"/>',
  link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2m3 6a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4m0 3v.1"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  grid: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2Z"/><path d="M7 3v6h10V3M7 21v-8h10v8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alert: '<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3v.1"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  history: '<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2"/>',
  inbox: '<path d="M4 4h16l2 13v3H2v-3L4 4Z"/><path d="M2 15h6l2 3h4l2-3h6"/>',
  edit: '<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 15l-1 6Z"/>',
  folder: '<path d="M3 7V4h7l2 3h9v14H3V7Z"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.file}</svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const date = value => value ? new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Oral' }).format(new Date(value.includes('T') ? value : `${value}T12:00:00+05:00`)) : '—';
const time = value => new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Oral' }).format(new Date(value));
const shortName = value => { if (!value) return 'Не назначен'; const [surname, ...parts] = value.split(' '); return `${surname} ${parts.map(p => p[0] + '.').join(' ')}`; };
const levelName = item => `Юридическая экспертиза ${item.level}`;
const stageName = item => item.level === 2 ? 'Основной этап' : 'Заключительный этап';
const KEY = 'saq-lawyers-v1';
let storageAvailable = true;
let records;
try { const value = JSON.parse(localStorage.getItem(KEY) || 'null'); records = Array.isArray(value) && value.every(r => r.id && r.documents && r.assessments && r.result && r.history && r.versions && r.directions) ? value : seedData(); } catch { records = seedData(); }
const state = { tab: 'all', search: '', level: 'all', assignee: 'all', today: false, reviewGroup: 'common', errors: [], savedAt: '', previewDocument: null };
const main = document.querySelector('main');
const modal = document.querySelector('#modal');
const toastNode = document.querySelector('#toast');
let toastTimeout;
let saveTimeout;

function toast(message) { toastNode.textContent = message; toastNode.classList.add('show'); clearTimeout(toastTimeout); toastTimeout = setTimeout(() => toastNode.classList.remove('show'), 4500); }
function persist(show = false) {
  try { localStorage.setItem(KEY, JSON.stringify(records)); storageAvailable = true; state.savedAt = new Date().toISOString(); if (show) toast('Черновик сохранён в этом браузере'); }
  catch { storageAvailable = false; toast('Не удалось сохранить данные в браузере. Скачайте результат перед закрытием страницы.'); }
  document.querySelectorAll('[data-save-state]').forEach(el => { el.innerHTML = `${icon(storageAvailable ? 'check' : 'alert')}${storageAvailable ? 'Сохранено в этом браузере' : 'Изменения пока не сохранены'}`; });
}
function addHistory(item, action, detail, author = 'Ермекова Алия Сериковна') { item.history.unshift({ time: new Date().toISOString(), action, detail, author }); }
function currentRoute() { const parts = location.hash.replace(/^#\/?/, '').split('/').map(p => { try { return decodeURIComponent(p); } catch { return ''; } }); return { view: parts[0] || 'registry', id: parts[1], tab: parts[2] || 'documents' }; }
function currentItem() { return records.find(item => item.id === currentRoute().id); }
function navigate(hash) { state.errors = []; if (location.hash === hash) render(); else location.hash = hash; document.querySelector('#sidebar').classList.remove('open'); }
function reviewUrl(item, tab = 'documents') { return `#/review/${encodeURIComponent(item.id)}/${tab}`; }
function isReadonly(item) { return item.status === 'completed' || item.status === 'rework' || !item.assigned; }
function disabled(item) { return isReadonly(item) ? 'disabled' : ''; }
function statusTag(item) { return `<span class="tag ${item.status}">${STATUS[item.status]}</span>`; }
function errorBox() { return state.errors.length ? `<div class="error-box" role="alert" tabindex="-1"><strong>Проверьте заполнение</strong><ul>${state.errors.map(e => `<li>${esc(e)}</li>`).join('')}</ul></div>` : ''; }
function showErrors(errors) { state.errors = errors; render(); requestAnimationFrame(() => document.querySelector('.error-box')?.focus()); }
function modalShell(title, body, footer = '', size = '') { modal.style.width = size; document.querySelector('#modal-content').innerHTML = `<div class="modal-head"><h2 id="modal-title">${esc(title)}</h2><button class="icon-btn" data-action="close-modal" aria-label="Закрыть">${icon('close')}</button></div><div class="modal-body">${body}</div>${footer ? `<div class="modal-footer">${footer}</div>` : ''}`; if (!modal.open) modal.showModal(); }
function closeModal() { modal.close(); }
function download(filename, content, type = 'text/plain;charset=utf-8') { const url = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function matches(item, ignoreTab = false) {
  const text = `${item.name} ${item.bin} ${item.event} ${item.id}`.toLocaleLowerCase('ru');
  return (ignoreTab || state.tab === 'all' || item.status === state.tab) && (!state.search || text.includes(state.search.toLocaleLowerCase('ru').trim())) && (state.level === 'all' || item.level === Number(state.level)) && (state.assignee === 'all' || (state.assignee === 'mine' ? item.assigned === STAFF[0] : !item.assigned)) && (!state.today || (item.due <= new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Oral' }) && item.status !== 'completed'));
}
function nextStep(item) {
  if (item.status === 'new') return ['Назначить исполнителя', 'Комплект готов к рассмотрению'];
  if (item.status === 'rework') return ['Ожидается исправленный комплект', `${findings(item).length} замечание · ответ аудитора`];
  if (item.status === 'completed') return [OUTCOMES[item.result.outcome], `Завершена ${date(item.completedAt)}`];
  const p = progress(item); return [p.reviewed === p.total ? 'Оформить результат экспертизы' : 'Провести правовую оценку', `Проверено ${p.reviewed} из ${p.total} критериев`];
}
function renderRegistry() {
  const tabs = [['new', 'Новые'], ['work', 'В работе'], ['rework', 'На доработке'], ['completed', 'Завершённые'], ['all', 'Все экспертизы']];
  const visible = records.filter(item => matches(item));
  const filtered = state.search || state.level !== 'all' || state.assignee !== 'all' || state.today;
  main.innerHTML = `<div class="page-heading"><div><h1>Юридическая экспертиза</h1><p>Аудиторские документы, правовая оценка и результаты рассмотрения</p></div><div class="heading-actions"><button class="btn" data-action="export-registry">${icon('download')}Выгрузить реестр</button><button class="btn primary" data-action="sample">${icon('plus')}Тестовый комплект</button></div></div>
  <section class="surface filter-panel" aria-label="Поиск и фильтры"><div class="filter-top"><div class="tabs" role="tablist" aria-label="Статус экспертизы">${tabs.map(([id, title]) => `<button class="tab ${state.tab === id ? 'active' : ''}" role="tab" aria-selected="${state.tab === id}" data-tab="${id}">${title}<span class="count">${records.filter(i => matches(i, true) && (id === 'all' || i.status === id)).length}</span></button>`).join('')}</div><label class="search-box">${icon('search')}<input id="registry-search" aria-label="Поиск по наименованию, БИН или номеру" placeholder="Наименование, БИН или номер мероприятия" value="${esc(state.search)}" autocomplete="off"></label></div>
  <div class="filter-bottom"><div class="filters"><select class="select" id="level-filter" aria-label="Уровень юридической экспертизы"><option value="all">Все уровни экспертизы</option><option value="2" ${state.level === '2' ? 'selected' : ''}>Юридическая экспертиза 2</option><option value="3" ${state.level === '3' ? 'selected' : ''}>Юридическая экспертиза 3</option></select><select class="select" id="assignee-filter" aria-label="Исполнитель"><option value="all">Все исполнители</option><option value="mine" ${state.assignee === 'mine' ? 'selected' : ''}>Назначено мне</option><option value="unassigned" ${state.assignee === 'unassigned' ? 'selected' : ''}>Без исполнителя</option></select><label class="filter-check"><input type="checkbox" id="due-filter" ${state.today ? 'checked' : ''}>Срок сегодня и ранее</label>${filtered ? '<button class="text-link" data-action="reset-filters">Сбросить</button>' : ''}</div><span class="found" aria-live="polite">Найдено: <strong>${visible.length}</strong></span></div></section>
  <section class="surface" aria-label="Реестр экспертиз">${visible.length ? `<div class="registry-scroll"><table class="registry"><thead><tr><th scope="col">Объект аудита</th><th scope="col">Экспертиза</th><th scope="col">Статус и следующий шаг</th><th scope="col">Исполнитель</th><th scope="col">Срок</th><th scope="col">Действие</th></tr></thead><tbody>${visible.map(item => { const [step, sub] = nextStep(item); return `<tr><td><button class="object-link" data-open="${item.id}">${esc(item.name)}</button><span class="subtext">${esc(item.event)} · БИН ${item.bin}</span></td><td><div class="level-name">${levelName(item)}</div><span class="subtext">${stageName(item)}</span><span class="subtext">${item.id}</span></td><td>${statusTag(item)}<span class="next-action">${esc(step)}</span><span class="subtext">${esc(sub)}</span></td><td class="row-responsible">${esc(shortName(item.assigned))}${!item.assigned ? '<span class="subtext">Требуется назначение</span>' : '<span class="subtext">Правовое подразделение</span>'}</td><td class="row-deadline">${date(item.due)}<span class="subtext">Поступил ${date(item.received)}</span></td><td><button class="btn small" data-open="${item.id}">Открыть</button></td></tr>`; }).join('')}</tbody></table></div><div class="table-caption"><span>Показано ${visible.length} из ${records.length} экспертиз</span><span>Источник: демонстрационные комплекты ВГА</span></div>` : `<div class="empty-state"><div class="empty-symbol">${icon('inbox')}</div><h2>${filtered ? 'По вашему запросу ничего не найдено' : 'Здесь пока нет экспертиз'}</h2><p>${filtered ? 'Попробуйте изменить запрос или параметры поиска.' : 'После передачи комплекта документов он появится в этой вкладке.'}</p><button class="btn" data-action="reset-filters">Показать все экспертизы</button></div>`}</section>`;
}

function renderDetail(item, selectedTab) {
  const detailTabs = [['documents', 'Документы'], ['assessment', 'Правовая оценка'], ['remarks', 'Замечания'], ['result', 'Результат экспертизы'], ['history', 'История']];
  const tab = detailTabs.some(([key]) => key === selectedTab) ? selectedTab : 'documents';
  const p = progress(item);
  let notice = '';
  if (item.status === 'new') notice = `<div class="notice">${icon('info')}<div><strong>Новый комплект документов</strong>Назначьте исполнителя, чтобы приступить к юридической экспертизе.</div><div class="notice-actions"><button class="btn small soft" data-action="assign">Назначить исполнителя</button></div></div>`;
  if (item.status === 'rework') notice = `<div class="notice amber">${icon('clock')}<div><strong>Комплект находится на доработке</strong>Замечания сохранены. Следующий шаг — получить исправленные документы от аудитора.</div><div class="notice-actions"><button class="btn small" data-action="resubmit">Тест: получить исправления</button></div></div>`;
  if (item.status === 'completed') notice = `<div class="notice green">${icon('check')}<div><strong>Юридическая экспертиза завершена</strong>${date(item.completedAt)} · ${esc(OUTCOMES[item.result.outcome])}. Результат сохранён в рабочем макете.</div><div class="notice-actions"><button class="btn small" data-action="export-result">${icon('download')}Скачать результат</button></div></div>`;
  main.innerHTML = `<div class="breadcrumb"><button data-action="home">Юридическая экспертиза</button>${icon('chevron')}<span>${item.id}</span></div>
  <div class="page-heading detail-heading"><div><h1>${esc(item.name)}</h1><div class="detail-number"><span>${item.id}</span><span>·</span><span>${levelName(item)}</span>${statusTag(item)}</div></div><div class="heading-actions"><button class="btn" data-action="versions">${icon('history')}Версии комплекта <span class="count">${item.iteration}</span></button><button class="btn" data-action="home">К реестру</button></div></div>
  <section class="surface detail-summary" aria-label="Сведения об экспертизе"><div class="summary-field"><span>Уровень экспертизы</span><strong>${levelName(item)}</strong><small>${stageName(item)}</small></div><div class="summary-field"><span>Аудиторское мероприятие</span><strong>${esc(item.event)}</strong><small>БИН ${item.bin}</small></div><div class="summary-field"><span>Исполнитель</span><strong>${esc(shortName(item.assigned))}</strong>${item.status !== 'completed' ? '<button class="text-link" data-action="assign">Изменить исполнителя</button>' : '<small>Правовое подразделение</small>'}</div><div class="summary-field"><span>Дата поступления</span><strong>${date(item.received)}</strong><small>Передача ${item.iteration}</small></div><div class="summary-field"><span>Срок экспертизы</span><strong>${date(item.due)}</strong><small>Тестовая дата</small></div></section>${notice}
  <section class="surface"><nav class="detail-tabs" aria-label="Разделы карточки">${detailTabs.map(([key, text]) => `<a class="detail-tab ${key === tab ? 'active' : ''}" href="${reviewUrl(item, key)}" ${key === tab ? 'aria-current="page"' : ''}>${text}${key === 'remarks' ? `<span class="count">${findings(item).length}</span>` : key === 'assessment' ? `<span class="count">${p.reviewed}/${p.total}</span>` : ''}</a>`).join('')}</nav><div class="tab-content">${errorBox()}${tab === 'documents' ? renderDocuments(item) : tab === 'assessment' ? renderAssessment(item) : tab === 'remarks' ? renderRemarks(item) : tab === 'result' ? renderResult(item) : renderHistory(item)}</div></section>`;
}
function renderDocuments(item) {
  return `<div class="section-top"><div><h2>Комплект документов</h2><p>Документы ${stageName(item).toLocaleLowerCase('ru') === 'основной этап' ? 'основного' : 'заключительного'} этапа, переданные для юридической экспертизы</p></div><span class="tag">Передача ${item.iteration} · ${item.documents.length} документа</span></div>
  <div class="document-table"><div class="document-row head"><span>Документ</span><span>Номер</span><span>Дата</span><span>Версия</span><span>Действие</span></div>${item.documents.map(d => `<div class="document-row"><div class="doc-title"><span class="doc-symbol">${icon('file')}</span><div><strong>${esc(d.title)}</strong><span class="subtext">${esc(d.kind)}</span></div></div><span>${esc(d.number)}</span><span>${date(d.date)}</span><span class="tag">Версия ${d.version}</span><button class="btn small" data-document="${d.id}">Просмотреть</button></div>`).join('')}</div>
  <div class="info-note">${icon('info')}<span>В макете доступны демонстрационные фрагменты документов. Проверяется конкретная переданная версия; при повторной передаче предыдущий комплект сохраняется.</span></div>
  <div class="assessment-footer"><span class="muted" style="font-size:13px">${esc(shortName(item.auditor))} · аудитор</span><a class="btn primary" href="${reviewUrl(item, 'assessment')}">${isReadonly(item) ? 'Открыть правовую оценку' : 'Перейти к правовой оценке'}</a></div>`;
}
function renderAssessment(item) {
  const groups = questionGroups(item); if (!groups.some(g => g.id === state.reviewGroup)) state.reviewGroup = 'common';
  const group = groups.find(g => g.id === state.reviewGroup); const p = progress(item);
  return `<div class="review-header"><div><div class="progress-title">Проверено <strong>${p.reviewed} из ${p.total}</strong> критериев</div><div class="progress-track"><span style="width:${p.reviewed / p.total * 100}%"></span></div><div class="review-summary"><span>Общая правовая оценка и выбранные направления</span><span class="issue-count">Замечаний: ${p.issues}</span></div></div><div class="button-group"><button class="btn small" data-action="directions" ${disabled(item)}>Направления проверки</button><button class="btn small" data-action="save" ${disabled(item)}>${icon('save')}Сохранить черновик</button></div></div>
  <div class="review-layout"><aside class="review-outline" aria-label="Направления правовой оценки"><p class="eyebrow">Проверочные листы</p>${groups.map(g => `<button class="outline-item ${g.id === group.id ? 'active' : ''}" data-group="${g.id}">${icon(g.id === 'common' ? 'scale' : 'checklist')}<span>${g.title}</span><small>${g.questions.filter(q => item.assessments[q.id]?.answer && item.assessments[q.id].answer !== 'pending').length}/${g.questions.length}</small></button>`).join('')}<button class="btn small" data-action="templates">${icon('info')}О критериях проверки</button></aside>
  <div class="check-group"><h3>${group.title}</h3><p class="group-description">Пример рабочего проверочного листа. Оценка и выводы заполняются юристом по материалам комплекта.</p>${group.questions.map(q => renderCriterion(item, q)).join('')}</div></div>
  <div class="assessment-footer"><span class="save-state" data-save-state>${icon('check')}${storageAvailable ? 'Черновик сохраняется в этом браузере' : 'Сохранение недоступно'}</span><div class="button-group"><a class="btn" href="${reviewUrl(item, 'remarks')}">Посмотреть замечания</a><a class="btn primary" href="${reviewUrl(item, 'result')}">Перейти к результату</a></div></div>`;
}
function renderCriterion(item, q) {
  const a = item.assessments[q.id] || { answer: 'pending' }; const uid = q.id; const lock = disabled(item);
  return `<article class="criterion" data-criterion="${uid}"><div class="criterion-top"><div class="criterion-text"><h4 class="criterion-title">${esc(q.title)}</h4><p>${esc(q.text)}</p></div><select class="select answer-select ${esc(a.answer)}" data-answer="${uid}" aria-label="${esc(q.title)} — оценка" ${lock}>${Object.entries(ANSWERS).map(([v, label]) => `<option value="${v}" ${a.answer === v ? 'selected' : ''}>${label}</option>`).join('')}</select></div>${a.answer === 'issue' ? `<div class="criterion-fields"><div class="form-grid"><label class="field">Документ <span class="required">*</span><select class="select" data-assess="${uid}" data-field="documentId" ${lock}><option value="">Выберите документ</option>${item.documents.map(d => `<option value="${d.id}" ${a.documentId === d.id ? 'selected' : ''}>${esc(d.title)}</option>`).join('')}</select></label><label class="field">Пункт / раздел документа <span class="required">*</span><input data-assess="${uid}" data-field="point" value="${esc(a.point)}" placeholder="Например, пункт 4" ${lock}></label><label class="field full">Замечание юриста <span class="required">*</span><textarea data-assess="${uid}" data-field="comment" placeholder="Укажите выявленное несоответствие и его обоснование" ${lock}>${esc(a.comment)}</textarea></label><label class="field full">Норма НПА <span class="required">*</span><input data-assess="${uid}" data-field="npa" value="${esc(a.npa)}" placeholder="Наименование, реквизиты НПА, статья и пункт" ${lock}></label><label class="field full">Рекомендуемое исправление <span class="required">*</span><textarea data-assess="${uid}" data-field="recommendation" placeholder="Укажите, что необходимо уточнить или исправить" ${lock}>${esc(a.recommendation)}</textarea></label></div></div>` : a.answer === 'na' ? `<div class="criterion-fields"><label class="field">Причина неприменимости <span class="required">*</span><textarea data-assess="${uid}" data-field="comment" placeholder="Поясните, почему критерий не применяется к этим материалам" ${lock}>${esc(a.comment)}</textarea></label></div>` : ''}</article>`;
}
function renderRemarks(item) {
  const list = findings(item);
  return `<div class="section-top"><div><h2>Замечания по документам</h2><p>Формируются из правовой оценки с привязкой к документу и его пункту</p></div>${list.length ? '<button class="btn small" data-action="export-remarks">' + icon('download') + 'Скачать замечания</button>' : ''}</div>${list.length ? `<div class="remarks-list">${list.map((f, index) => { const doc = item.documents.find(d => d.id === f.documentId); return `<article class="remark"><div class="remark-head"><div><h3>${index + 1}. ${esc(f.title)}</h3><div class="remark-source">${esc(doc?.title || 'Документ не выбран')} · ${f.point ? `пункт ${esc(f.point)}` : 'пункт не указан'}${doc ? ` · версия ${doc.version}` : ''}</div></div><span class="tag rework">Есть замечание</span></div><div class="remark-label">Замечание юриста</div><p>${esc(f.comment || 'Замечание ещё не заполнено')}</p><div class="remark-label">Норма НПА</div><p>${esc(f.npa || 'Не указана')}</p><div class="remark-label">Рекомендуемое исправление</div><p>${esc(f.recommendation || 'Не заполнено')}</p>${f.auditorReply ? `<div class="remark-reply"><strong>Ответ аудитора · демонстрация</strong><p>${esc(f.auditorReply)}</p></div>` : ''}${!isReadonly(item) ? `<button class="text-link" data-edit-criterion="${f.id}" style="margin-top:15px">${icon('edit')}Изменить в правовой оценке</button>` : ''}</article>`; }).join('')}</div>` : `<div class="empty-state"><div class="empty-symbol">${icon('checklist')}</div><h2>Замечания пока не зафиксированы</h2><p>При выборе «Есть замечания» в проверочном листе<br>здесь появится запись по соответствующему документу.</p><a class="btn" href="${reviewUrl(item, 'assessment')}">Открыть правовую оценку</a></div>`}
  ${list.length && !isReadonly(item) ? `<div class="assessment-footer"><span class="muted" style="font-size:13px">Перед передачей заполните все выбранные критерии.</span><button class="btn primary" data-action="return">Передать замечания на доработку</button></div>` : ''}`;
}
function renderResult(item) {
  const p = progress(item); const lock = disabled(item); const completed = item.status === 'completed';
  return `<div class="section-top"><div><h2>Результат юридической экспертизы</h2><p>Общий вывод по переданному комплекту документов</p></div></div>${completed ? `<div class="completed-result"><span class="tag completed">Экспертиза завершена</span><h3>${esc(OUTCOMES[item.result.outcome])}</h3><p>${esc(item.result.text)}</p><span class="subtext">${esc(item.assigned)} · ${date(item.completedAt)}</span></div>` : ''}
  <div class="result-layout"><div class="result-box">${!completed ? `<label class="field">Общий вывод <span class="required">*</span><select class="select" id="result-outcome" ${lock}><option value="">Выберите общий вывод</option>${Object.entries(OUTCOMES).map(([key, name]) => `<option value="${key}" ${item.result.outcome === key ? 'selected' : ''}>${name}</option>`).join('')}</select><small>Вывод определяет юрист по содержанию материалов и замечаний.</small></label><label class="field">Обоснование общего вывода <span class="required">*</span><textarea class="tall" id="result-text" placeholder="Опишите результат проверки, существенные замечания и рекомендации" ${lock}>${esc(item.result.text)}</textarea></label>` : ''}
  <div><label class="field" style="margin-bottom:9px">Приложения к результату</label>${!isReadonly(item) ? `<label class="upload-control" for="result-files">${icon('upload')}<span><strong>Прикрепить файл</strong><small>PDF, DOCX, XLSX, TXT, PNG, JPG · до 1 МБ на файл</small></span><input id="result-files" type="file" accept=".pdf,.docx,.xlsx,.txt,.png,.jpg,.jpeg" multiple hidden></label>` : ''}<div class="attachment-list">${(item.result.attachments || []).map((f, i) => `<div class="attachment">${icon('file')}<span>${esc(f.name)}<small class="subtext">${Math.ceil(f.size / 1024)} КБ</small></span><button class="text-link" data-download-attachment="${i}">Скачать</button>${!isReadonly(item) ? `<button class="icon-btn" data-remove-attachment="${i}" aria-label="Удалить приложение ${esc(f.name)}">${icon('close')}</button>` : ''}</div>`).join('') || '<span class="subtext">Приложений нет</span>'}</div></div>
  <div class="info-note">${icon('info')}<span>Электронная запись результата. Согласованная печатная форма и подписание будут добавлены после определения требований.</span></div></div><aside class="result-sidebar"><h3>Состояние проверки</h3><div class="result-stat"><span>Критериев проверено</span><strong>${p.reviewed} / ${p.total}</strong></div><div class="result-stat"><span>Замечаний</span><strong>${p.issues}</strong></div><div class="result-stat"><span>Версия комплекта</span><strong>${item.iteration}</strong></div><p>Завершение доступно после рассмотрения всех критериев и заполнения общего вывода. Балльная оценка не применяется.</p></aside></div>
  <div class="assessment-footer"><span class="save-state" data-save-state>${icon('check')}${completed ? 'Результат сохранён в макете' : 'Черновик сохраняется в этом браузере'}</span><div class="button-group">${completed ? '<button class="btn primary" data-action="export-result">' + icon('download') + 'Скачать результат</button>' : `<button class="btn" data-action="save" ${lock}>Сохранить черновик</button>${findings(item).length ? `<button class="btn" data-action="return" ${lock}>Передать на доработку</button>` : ''}<button class="btn primary" data-action="complete" ${lock}>Завершить экспертизу</button>`}</div></div>`;
}
function renderHistory(item) { return `<div class="section-top"><div><h2>История рассмотрения</h2><p>Поступление комплектов, назначения и результаты экспертизы</p></div></div><div class="timeline">${item.history.map(h => `<div class="timeline-item"><h3>${esc(h.action)}</h3><p>${esc(h.detail)}</p><small>${time(h.time)} · ${esc(h.author)}</small></div>`).join('')}</div>`; }
function renderTemplates() {
  const groups = questionGroups({ directions: Object.keys(DIRECTIONS), level: 3 });
  main.innerHTML = `<div class="page-heading"><div><h1>Проверочные листы</h1><p>Предлагаемые критерии правовой оценки для юридической экспертизы 2 и 3</p></div><button class="btn" data-action="home">К реестру</button></div><div class="notice">${icon('info')}<div><strong>Рабочие примеры критериев</strong>Вопросы используются для демонстрации процесса. Содержание листов и их обязательность необходимо согласовать с правовым подразделением.</div></div><div class="template-grid">${groups.map(g => `<button class="template-card" data-template="${g.id}">${icon(g.id === 'common' ? 'scale' : 'checklist')}<h3>${g.title}</h3><p>${g.id === 'common' ? 'Применимость норм, редакция законодательства, доказательства и правовая квалификация.' : g.id === 'final' ? 'Рекомендации, требования, адресат предписания и учёт предыдущей экспертизы.' : `Проверка правового обоснования выводов по направлению «${g.title}».`}</p><small>${g.questions.length} критериев · ${g.id === 'final' ? 'Юридическая экспертиза 3' : 'Юридическая экспертиза 2 и 3'}</small><span class="text-link">Посмотреть критерии</span></button>`).join('')}</div>`;
}
function render() {
  const route = currentRoute();
  document.querySelectorAll('[data-nav]').forEach(el => el.classList.toggle('active', route.view !== 'templates'));
  if (route.view === 'review') { const item = records.find(i => i.id === route.id); if (item) renderDetail(item, route.tab); else main.innerHTML = '<div class="surface empty-state"><h1>Карточка не найдена</h1><p>Вернитесь в реестр и выберите экспертизу.</p><button class="btn" data-action="home">К реестру</button></div>'; }
  else if (route.view === 'templates') renderTemplates(); else renderRegistry();
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
}

function documentPreview(item, documentId, versionItem = null) {
  const source = versionItem || item; const doc = source.documents.find(d => d.id === documentId); if (!doc) return;
  state.previewDocument = { itemId: item.id, documentId, versionItem };
  const sample = {
    report: '<h4>4. Результаты рассмотрения вопроса программы аудита</h4><p>В ходе изучения материалов рассмотрено документальное обоснование исполнения договора. В реестре отражены обстоятельства, требующие проверки правильности применения законодательства.</p><h4>5. Подтверждающие материалы</h4><p>Договор, документы об исполнении обязательств и пояснения ответственных лиц приведены в составе аудиторских доказательств.</p>',
    register: '<h4>Пункт 4. Правовое обоснование нарушения</h4><p>Вопрос: документальное подтверждение исполнения договорных обязательств.</p><p>Связанные материалы: аудиторский отчёт, пункт 4; аудиторские доказательства.</p>',
    proof: '<h4>Документы к пункту 4</h4><p>Демонстрационный перечень: договор, акт выполненных работ, пояснение ответственного лица.</p><h4>Документы к пункту 5</h4><p>Демонстрационный перечень: бухгалтерская справка и выписка из регистра учёта.</p>',
    conclusion: '<h4>Выводы по результатам аудиторского мероприятия</h4><p>Обобщены обстоятельства, отражённые в материалах мероприятия. Проекты рекомендаций и требований представлены для правовой оценки.</p><h4>Рекомендации</h4><p>Рассмотреть уточнение процедур документального подтверждения исполнения договорных обязательств.</p>',
    instruction: `<h4>Адресат</h4><p>${esc(item.name)}</p><h4>Пункт 1. Предлагаемое требование</h4><p>Рассмотреть выявленные обстоятельства и представить подтверждающие документы о принятых мерах в установленном порядке.</p>`,
    summary: '<h4>Сводные сведения</h4><p>Демонстрационный реестр обобщает обстоятельства и правовые выводы по материалам аудиторского мероприятия.</p><p>Каждая запись должна быть связана с соответствующим отчётом и подтверждающими материалами.</p>'
  };
  modalShell(doc.title, `<div class="doc-preview"><div class="preview-mark">Демонстрационный фрагмент · не официальный документ</div><h3>${esc(doc.title)}</h3><dl><dt>Объект аудита</dt><dd>${esc(item.name)}</dd><dt>Номер документа</dt><dd>${esc(doc.number)}</dd><dt>Дата / версия</dt><dd>${date(doc.date)} · версия ${doc.version}</dd></dl>${sample[doc.id] || '<p>Демонстрационный материал.</p>'}</div>`, `<button class="btn" data-action="close-modal">Закрыть</button><button class="btn primary" data-action="download-document">${icon('download')}Скачать фрагмент TXT</button>`, '850px');
}
function exportResult(item, remarksOnly = false) {
  const lines = ['SAQ · ДЕМОНСТРАЦИОННЫЕ ДАННЫЕ', remarksOnly ? 'Замечания по результатам правовой оценки' : 'Электронная запись результата юридической экспертизы', '', item.id, levelName(item), item.name, `БИН: ${item.bin}`, `Аудиторское мероприятие: ${item.event}`, `Исполнитель: ${item.assigned || 'не назначен'}`, `Передача комплекта: ${item.iteration}`, `Статус: ${STATUS[item.status]}`, '', 'ДОКУМЕНТЫ', ...item.documents.map(d => `${d.title} · ${d.number} · версия ${d.version}`), ''];
  if (!remarksOnly) { lines.push('ОБЩИЙ ВЫВОД', OUTCOMES[item.result.outcome] || 'Не указан', item.result.text || 'Не заполнено', '', 'ПРАВОВАЯ ОЦЕНКА'); for (const group of questionGroups(item)) { lines.push('', group.title); for (const q of group.questions) { const a = item.assessments[q.id] || { answer: 'pending' }; lines.push(`${q.title}: ${ANSWERS[a.answer]}`); if (a.answer === 'na') lines.push(`Причина: ${a.comment || 'не заполнена'}`); } } }
  lines.push('', 'ЗАМЕЧАНИЯ'); findings(item).forEach((f, index) => { const doc = item.documents.find(d => d.id === f.documentId); lines.push('', `${index + 1}. ${f.title}`, `Документ: ${doc?.title || 'не выбран'}, пункт ${f.point || 'не указан'}`, `Замечание: ${f.comment || 'не заполнено'}`, `НПА: ${f.npa || 'не указан'}`, `Рекомендация: ${f.recommendation || 'не заполнена'}`); });
  if (!findings(item).length) lines.push('Замечания не зафиксированы.');
  lines.push('', 'Рабочий макет. Запись не является подписанным юридическим заключением.');
  download(`${item.id}-${remarksOnly ? 'замечания' : 'результат'}.txt`, '\uFEFF' + lines.join('\n'));
}
function openAssign(item) {
  modalShell('Назначение исполнителя', `<p>Выберите юриста для рассмотрения комплекта «${esc(item.id)}».</p><label class="field">Исполнитель<select class="select" id="assign-person">${STAFF.map(person => `<option ${person === item.assigned ? 'selected' : ''}>${person}</option>`).join('')}</select></label>`, '<button class="btn" data-action="close-modal">Отмена</button><button class="btn primary" data-action="confirm-assign">Назначить</button>');
}
function openDirections(item) { modalShell('Направления правовой оценки', `<p>Общая правовая оценка включена для всех комплектов. Выберите дополнительные направления по содержанию материалов.</p>${Object.entries(DIRECTIONS).map(([key, label]) => `<label class="check-option"><input type="checkbox" name="direction" value="${key}" ${item.directions.includes(key) ? 'checked' : ''}><span><strong>${label}</strong><p>Три дополнительных критерия правовой оценки</p></span></label>`).join('')}<div class="info-note">${icon('info')}Ответы скрытых направлений сохраняются. Они снова появятся при повторном выборе направления.</div>`, '<button class="btn" data-action="close-modal">Отмена</button><button class="btn primary" data-action="confirm-directions">Применить</button>'); }
function openVersionList(item) {
  modalShell('Версии переданного комплекта', `<p>Для каждой передачи сохраняется состав документов и результаты правовой оценки.</p><div class="version-card"><h3>Передача ${item.iteration} · текущая</h3><p>${item.documents.map(d => `${esc(d.title)} · версия ${d.version}`).join('<br>')}</p></div>${item.versions.map((v, index) => `<div class="version-card"><h3>Передача ${v.number} · предыдущая</h3><p>${v.documents.map(d => `${esc(d.title)} · версия ${d.version}`).join('<br>')}</p><button class="text-link" data-view-version="${index}">Посмотреть сохранённую оценку и документы</button></div>`).join('') || '<p class="subtext">Предыдущих передач пока нет.</p>'}`, '<button class="btn" data-action="close-modal">Закрыть</button>');
}
function openSample() {
  modalShell('Тестовая передача комплекта из ВГА', `<p>Добавьте демонстрационный комплект, чтобы пройти назначение, правовую оценку и оформление результата. Настоящие документы из ВГА сейчас не загружаются.</p><div class="form-grid"><label class="field full">Уровень экспертизы<select class="select" id="sample-level"><option value="2">Юридическая экспертиза 2 · основной этап</option><option value="3">Юридическая экспертиза 3 · заключительный этап</option></select></label><label class="field full">Наименование объекта<input id="sample-name" value="ГУ «Учебный центр развития»" maxlength="200"></label><label class="field">БИН объекта<input id="sample-bin" value="000000001008" inputmode="numeric" maxlength="12"></label><label class="field">Номер мероприятия<input id="sample-event" value="30101-26-00021-ТА" maxlength="70"></label></div>`, '<button class="btn" data-action="close-modal">Отмена</button><button class="btn primary" data-action="confirm-sample">Добавить комплект</button>');
}
function openComplete(item) {
  const errors = completionErrors(item); if (errors.length) { showErrors(errors); return; }
  modalShell('Завершение юридической экспертизы', `<p>Сохранить результат экспертизы по комплекту <strong>${esc(item.id)}</strong>?</p><div class="completed-result"><span class="subtext">Общий вывод</span><h3>${OUTCOMES[item.result.outcome]}</h3><p>${esc(item.result.text)}</p></div><p>После завершения запись будет доступна для просмотра и скачивания. В макете подписание и направление результата в ВГА не выполняются.</p>`, '<button class="btn" data-action="close-modal">Отмена</button><button class="btn primary" data-action="confirm-complete">Завершить экспертизу</button>');
}
function openReturn(item) {
  const errors = assessmentErrors(item); if (!findings(item).length) errors.unshift('Для передачи на доработку необходимо зафиксировать хотя бы одно замечание.'); if (errors.length) { showErrors(errors); return; }
  modalShell('Передача замечаний на доработку', `<p>Для комплекта ${esc(item.id)} зафиксировано замечаний: <strong>${findings(item).length}</strong>.</p><label class="field">Сопроводительный комментарий<textarea id="return-comment" placeholder="Что необходимо учесть при доработке"></textarea></label><div class="notice">${icon('info')}<div>Тестовое действие: комплект перейдёт в статус «На доработке». Реальная отправка в ВГА не выполняется.</div></div>`, '<button class="btn" data-action="close-modal">Отмена</button><button class="btn primary" data-action="confirm-return">Передать на доработку</button>');
}

document.addEventListener('click', event => {
  const button = event.target.closest('button,[data-action]'); if (!button || button.disabled) return;
  const item = currentItem();
  if (button.dataset.tab) { state.tab = button.dataset.tab; render(); return; }
  if (button.dataset.open) { navigate(reviewUrl(records.find(i => i.id === button.dataset.open))); return; }
  if (button.dataset.group) { state.reviewGroup = button.dataset.group; state.errors = []; render(); return; }
  if (button.dataset.document) { documentPreview(item, button.dataset.document); return; }
  if (button.dataset.editCriterion) { state.reviewGroup = questionGroups(item).find(g => g.questions.some(q => q.id === button.dataset.editCriterion)).id; navigate(reviewUrl(item, 'assessment')); return; }
  if (button.dataset.template) {
    const group = questionGroups({ directions: Object.keys(DIRECTIONS), level: 3 }).find(g => g.id === button.dataset.template);
    modalShell(group.title, '<p>Пример критериев для согласования с правовым подразделением.</p>' + group.questions.map(q => `<div class="help-step"><strong>${q.title}</strong><p>${q.text}</p></div>`).join(''), '<button class="btn" data-action="close-modal">Закрыть</button>'); return;
  }
  if (button.dataset.viewVersion !== undefined) {
    const version = item.versions[Number(button.dataset.viewVersion)];
    const snapshot = { ...item, ...version }; const oldFindings = findings(snapshot);
    modalShell(`Передача ${version.number} · сохранённая оценка`, `<p>Предыдущая версия комплекта. Оценка и документы доступны только для просмотра.</p>${version.documents.map(d => `<div class="version-card"><h3>${esc(d.title)} · версия ${d.version}</h3><button class="text-link" data-old-document="${d.id}" data-version-index="${button.dataset.viewVersion}">Просмотреть фрагмент</button></div>`).join('')}<h3 style="font-size:16px;margin:20px 0 13px">Замечания предыдущей передачи</h3>${oldFindings.map(f => `<div class="version-card"><h3>${esc(f.title)} · пункт ${esc(f.point)}</h3><p>${esc(f.comment)}</p><p>НПА: ${esc(f.npa)}</p><p>Рекомендация: ${esc(f.recommendation)}</p></div>`).join('') || '<p class="subtext">Замечания не зафиксированы.</p>'}`, '<button class="btn" data-action="versions">К списку версий</button><button class="btn primary" data-action="close-modal">Закрыть</button>'); return;
  }
  if (button.dataset.oldDocument) { documentPreview(item, button.dataset.oldDocument, item.versions[Number(button.dataset.versionIndex)]); return; }
  if (button.dataset.removeAttachment !== undefined && item && !isReadonly(item)) { item.result.attachments.splice(Number(button.dataset.removeAttachment), 1); persist(); render(); return; }
  if (button.dataset.downloadAttachment !== undefined) {
    const f = item.result.attachments[Number(button.dataset.downloadAttachment)]; if (f) { const a = document.createElement('a'); a.href = f.data; a.download = f.name; a.click(); } return;
  }
  switch (button.dataset.action) {
    case 'menu': document.querySelector('#sidebar').classList.toggle('open'); break;
    case 'home': navigate('#/registry'); break;
    case 'templates': if (currentRoute().view === 'review') modalShell('О проверочных листах', '<p>Критерии помогают структурировать правовую оценку. Юрист выбирает применимые направления, проверяет документы и обосновывает замечания.</p><p>Предлагаемые вопросы требуют согласования с правовым подразделением. Их заполнение не заменяет профессиональную оценку юриста.</p>', '<button class="btn primary" data-action="close-modal">Понятно</button>'); else navigate('#/templates'); break;
    case 'close-modal': closeModal(); break;
    case 'reset-filters': Object.assign(state, { tab: 'all', search: '', level: 'all', assignee: 'all', today: false }); render(); break;
    case 'sample': openSample(); break;
    case 'confirm-sample': {
      const name = document.querySelector('#sample-name').value.trim(); const bin = document.querySelector('#sample-bin').value.trim(); const eventNumber = document.querySelector('#sample-event').value.trim();
      if (!name || !/^\d{12}$/.test(bin) || !eventNumber) { toast('Укажите наименование, БИН из 12 цифр и номер мероприятия'); return; }
      const level = Number(document.querySelector('#sample-level').value); const next = structuredClone(seedData().find(r => r.level === level)); const num = Math.max(12, ...records.map(r => Number(r.id.split('-').at(-1)))) + 1; const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Oral' });
      Object.assign(next, { id: `ЮЭ-2026-${String(num).padStart(4, '0')}`, name, bin, event: eventNumber, level, status: 'new', assigned: '', received: today, due: today, assessments: {}, result: { outcome: '', text: '', attachments: [] }, versions: [], iteration: 1, history: [] });
      next.documents = next.documents.map(d => ({ ...d, number: d.number.replace(/30101-26-[^\s]+/, eventNumber), date: today, version: 1 }));
      addHistory(next, 'Получен тестовый комплект', levelName(next), 'ВГА · демонстрация'); records.unshift(next); persist(); closeModal(); navigate(reviewUrl(next)); toast('Тестовый комплект добавлен'); break;
    }
    case 'assign': if (item?.status !== 'completed') openAssign(item); break;
    case 'confirm-assign': { if (!item || item.status === 'completed') return; item.assigned = document.querySelector('#assign-person').value; if (item.status === 'new') item.status = 'work'; addHistory(item, 'Назначен исполнитель', item.assigned, 'Руководитель правового подразделения'); persist(); closeModal(); render(); toast('Исполнитель назначен'); break; }
    case 'directions': if (item && !isReadonly(item)) openDirections(item); break;
    case 'confirm-directions': { if (!item || isReadonly(item)) return; item.directions = [...document.querySelectorAll('input[name="direction"]:checked')].map(el => el.value); addHistory(item, 'Изменены направления проверки', item.directions.map(id => DIRECTIONS[id]).join(', ') || 'Общая правовая оценка'); state.reviewGroup = 'common'; persist(); closeModal(); render(); break; }
    case 'save': persist(true); break;
    case 'versions': openVersionList(item); break;
    case 'return': if (item && !isReadonly(item)) openReturn(item); break;
    case 'confirm-return': { if (!item || isReadonly(item)) return; const errors = assessmentErrors(item); if (errors.length || !findings(item).length) { closeModal(); showErrors(errors); return; } const comment = document.querySelector('#return-comment').value.trim(); item.status = 'rework'; addHistory(item, 'Замечания переданы на доработку', comment || `Замечаний: ${findings(item).length}. Тестовая передача.`); persist(); closeModal(); render(); toast('Комплект переведён на доработку в макете'); break; }
    case 'resubmit': if (item?.status === 'rework') modalShell('Повторная передача документов', '<p>В макете будет создана новая передача комплекта. Предыдущие документы и замечания сохранятся в версиях, а правовая оценка новой передачи начнётся заново.</p><p>Это демонстрация получения исправлений от аудитора.</p>', '<button class="btn" data-action="close-modal">Отмена</button><button class="btn primary" data-action="confirm-resubmit">Получить исправленный комплект</button>'); break;
    case 'confirm-resubmit': { if (item?.status !== 'rework') return; records[records.findIndex(r => r.id === item.id)] = resubmit(item); state.reviewGroup = 'common'; persist(); closeModal(); render(); toast('Получена новая версия. Предыдущая оценка сохранена'); break; }
    case 'complete': if (item && !isReadonly(item)) openComplete(item); break;
    case 'confirm-complete': { if (!item || isReadonly(item)) return; try { records[records.findIndex(r => r.id === item.id)] = finishReview(item); persist(); closeModal(); render(); toast('Юридическая экспертиза завершена'); } catch (error) { closeModal(); showErrors(error.message.split('\n')); } break; }
    case 'export-result': exportResult(item); break;
    case 'export-remarks': exportResult(item, true); break;
    case 'export-registry': { const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`; const lines = [['Номер экспертизы', 'Объект', 'БИН', 'Мероприятие', 'Уровень', 'Статус', 'Исполнитель', 'Срок'], ...records.filter(i => matches(i)).map(i => [i.id, i.name, i.bin, i.event, levelName(i), STATUS[i.status], i.assigned, date(i.due)])]; download('Реестр-юридических-экспертиз.csv', '\uFEFF' + lines.map(line => line.map(quote).join(';')).join('\r\n'), 'text/csv;charset=utf-8'); break; }
    case 'download-document': { const p = state.previewDocument; const doc = (p.versionItem || records.find(r => r.id === p.itemId)).documents.find(d => d.id === p.documentId); download(`${doc.title}-фрагмент.txt`, '\uFEFF' + document.querySelector('.doc-preview').innerText); break; }
    case 'help': modalShell('Как работать с юридической экспертизой', '<div class="help-step"><strong>Получите комплект и назначьте исполнителя</strong><p>В реестре откройте новую экспертизу. В макете можно добавить тестовый комплект.</p></div><div class="help-step"><strong>Изучите документы и заполните правовую оценку</strong><p>Выберите направления проверки. По каждому критерию укажите ответ; замечания свяжите с документом и пунктом.</p></div><div class="help-step"><strong>При необходимости передайте замечания на доработку</strong><p>После тестового получения исправлений можно сравнить документы и прежнюю оценку в версиях.</p></div><div class="help-step"><strong>Оформите результат</strong><p>Заполните общий вывод и завершите экспертизу. Результат можно скачать как текстовую запись.</p></div><div class="info-note">' + icon('info') + 'Рабочий макет на демонстрационных данных. Подключение ВГА и подписание результата ещё не реализованы.</div>', '<button class="btn primary" data-action="close-modal">Понятно</button>'); break;
  }
});

document.addEventListener('input', event => {
  const el = event.target;
  if (el.id === 'registry-search') { const start = el.selectionStart; state.search = el.value; renderRegistry(); const replacement = document.querySelector('#registry-search'); replacement.focus(); replacement.setSelectionRange(start, start); return; }
  const item = currentItem(); if (!item || isReadonly(item)) return;
  if (el.dataset.assess) { const a = item.assessments[el.dataset.assess] ||= { answer: 'pending' }; a[el.dataset.field] = el.value; }
  else if (el.id === 'result-text') item.result.text = el.value; else return;
  clearTimeout(saveTimeout); saveTimeout = setTimeout(() => persist(), 350);
});
document.addEventListener('change', async event => {
  const el = event.target;
  if (el.id === 'level-filter') { state.level = el.value; render(); return; }
  if (el.id === 'assignee-filter') { state.assignee = el.value; render(); return; }
  if (el.id === 'due-filter') { state.today = el.checked; render(); return; }
  const item = currentItem(); if (!item || isReadonly(item)) return;
  if (el.dataset.answer) { const old = item.assessments[el.dataset.answer] || {}; item.assessments[el.dataset.answer] = { ...old, answer: el.value }; state.errors = []; persist(); render(); }
  else if (el.dataset.assess) { item.assessments[el.dataset.assess][el.dataset.field] = el.value; persist(); }
  else if (el.id === 'result-outcome') { item.result.outcome = el.value; persist(); }
  else if (el.id === 'result-files') {
    const allowed = /\.(pdf|docx|xlsx|txt|png|jpe?g)$/i;
    for (const file of [...el.files]) {
      if (!allowed.test(file.name)) { toast(`Недопустимый формат: ${file.name}`); continue; }
      if (file.size > 1024 * 1024) { toast(`Файл ${file.name} больше 1 МБ`); continue; }
      const total = records.reduce((sum, r) => sum + r.result.attachments.reduce((s, f) => s + f.size, 0), 0);
      if (total + file.size > 2 * 1024 * 1024) { toast('Достигнут общий объём приложений для макета: 2 МБ'); break; }
      try { const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); item.result.attachments.push({ name: file.name, size: file.size, type: file.type, data }); } catch { toast(`Не удалось прочитать файл ${file.name}`); }
    }
    persist(); render();
  }
});
modal.addEventListener('click', event => { if (event.target === modal) { const r = modal.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeModal(); } });
window.addEventListener('hashchange', () => { state.errors = []; render(); window.scrollTo({ top: 0 }); });
window.addEventListener('pagehide', () => { if (saveTimeout) persist(); });
render();

