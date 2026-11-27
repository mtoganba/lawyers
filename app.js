import { STAFF, STATUS, ANSWERS, DIRECTIONS, OUTCOMES, seedData, questionGroups, questions, progress, findings, assessmentErrors, completionErrors, finishReview, resubmit } from './core.js?v=vga-1';
import { conclusionModel, conclusionPreviewHtml, conclusionWord, conclusionFilename } from './print-forms.js?v=vga-1';

import { ACTORS, DEFAULT_HEAD, QUEUE_TABS, headOf, hasConclusion, objectCases, stageStep, queueRows, inQueueTab, searchQueue, newPacket, assignExpert, createConclusion, submitConclusion } from './workflow.js?v=vga-1';

const paths = {
  scale: '<path d="M12 3v17m-5 1h10M5 7h14M6 7l-4 8h8L6 7Zm12 0-4 8h8l-4-8Z"/>',
  checklist: '<rect x="5" y="3" width="15" height="19" rx="2"/><path d="m8 8 1 1 2-2m2 1h4m-9 5 1 1 2-2m2 1h4m-9 5h9"/>',
  link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2m3 6a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4m0 3v.1"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  grid: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  printer: '<path d="M6 9V3h12v6M6 17H3V9h18v8h-3M6 14h12v7H6V14Z"/><path d="M17 12h1"/>',
  minus: '<path d="M5 12h14"/>',
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
const state = { resultView: 'edit', printZoom: 80, printGeneratedAt: null, tab: 'mine', actor: STAFF[0], version: 'current', search: '', level: 'all', assignee: 'all', today: false, reviewGroup: 'common', errors: [], savedAt: '', previewDocument: null };
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
function addHistory(item, action, detail, author = state.actor) { item.history.unshift({ time: new Date().toISOString(), action, detail, author }); }
function currentRoute() { const parts = location.hash.replace(/^#\/?/, '').split('/').map(p => { try { return decodeURIComponent(p); } catch { return ''; } }); return { view: parts[0] || 'registry', id: parts[1], tab: parts[2] || 'documents' }; }
function currentItem() { return records.find(item => item.id === currentRoute().id); }
function navigate(hash) { state.errors = []; if (location.hash === hash) render(); else location.hash = hash; document.querySelector('#sidebar').classList.remove('open'); }
function reviewUrl(item, tab = 'form') { return `#/review/${encodeURIComponent(item.id)}/${tab}`; }
function isReadonly(item) { return state.version !== 'current' || item.status !== 'work' || item.assigned !== state.actor || !hasConclusion(item); }
function disabled(item) { return isReadonly(item) ? 'disabled' : ''; }
function statusTag(item) { return `<span class="tag ${item.status}">${STATUS[item.status]}</span>`; }
function errorBox() { return state.errors.length ? `<div class="error-box" role="alert" tabindex="-1"><strong>Проверьте заполнение</strong><ul>${state.errors.map(e => `<li>${esc(e)}</li>`).join('')}</ul></div>` : ''; }
function showErrors(errors) { state.errors = errors; render(); requestAnimationFrame(() => document.querySelector('.error-box')?.focus()); }
function modalShell(title, body, footer = '', size = '') { modal.style.width = size; document.querySelector('#modal-content').innerHTML = `<div class="modal-head"><h2 id="modal-title">${esc(title)}</h2><button class="icon-btn" data-action="close-modal" aria-label="Закрыть">${icon('close')}</button></div><div class="modal-body">${body}</div>${footer ? `<div class="modal-footer">${footer}</div>` : ''}`; if (!modal.open) modal.showModal(); }
function closeModal() { modal.close(); }
function download(filename, content, type = 'text/plain;charset=utf-8') { const url = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function objectUrl(object) { return `#/object/${encodeURIComponent(object.id)}`; }
function objectFor(item) { return objectCases(records).find(object => object.key === `${item.bin}|${item.event}`); }
function replaceRecord(item) { records[records.findIndex(record => record.id === item.id)] = item; }
function viewItem(item) {
  const snapshot = state.version === 'current' ? null : item.versions[Number(state.version)];
  return snapshot ? { ...item, ...snapshot, status: snapshot.status || 'rework', iteration: snapshot.number } : item;
}
function matches(item) {
  const row = queueRows(records, state.actor).find(row => row.key === `${item.bin}|${item.event}`);
  return row && inQueueTab(row, state.tab) && searchQueue(row, state.search);
}
function stateBadge(step) { return `<span class="quality-state ${step.tone}">${esc(step.state)}</span>`; }
function renderRegistry() {
  const rows = queueRows(records, state.actor);
  const current = QUEUE_TABS[state.tab] || QUEUE_TABS.mine;
  const visible = rows.filter(row => inQueueTab(row, state.tab) && searchQueue(row, state.search));
  main.innerHTML = `<div class="quality-registry"><div class="quality-registry-head"><div><h1>Юридическая экспертиза</h1><p>Что требует действия и кто продолжает работу</p></div><div class="registry-tools"><button class="text-link" data-action="export-registry">${icon('download')}Выгрузить реестр</button><button class="btn small" data-action="sample">${icon('plus')}Тестовый комплект</button></div></div>
  <section class="surface quality-filters" aria-label="Поиск и фильтры"><div class="quality-filter-row"><div class="quality-tabs" role="tablist" aria-label="Объекты юридической экспертизы">${Object.entries(QUEUE_TABS).map(([key, tab]) => `<button role="tab" aria-selected="${state.tab === key}" class="${state.tab === key ? 'active' : ''}" data-tab="${key}">${tab.title}<span class="quality-tab-count">${rows.filter(row => inQueueTab(row, key)).length}</span></button>`).join('')}</div><label class="quality-search">${icon('search')}<input id="registry-search" aria-label="Поиск объекта" placeholder="Наименование, БИН или номер мероприятия" value="${esc(state.search)}" autocomplete="off"></label></div><div class="quality-filter-summary"><span>${current.description}</span><span role="status" aria-live="polite">Найдено: <strong>${visible.length}</strong></span></div></section>
  <section class="surface quality-objects-panel" aria-label="Реестр объектов юридической экспертизы">${visible.length ? `<div class="table-wrap"><table class="quality-objects-table"><thead><tr><th>Объект аудита</th><th>Этап</th><th>Следующий шаг</th><th>Ответственный</th><th>Действие</th></tr></thead><tbody>${visible.map(row => `<tr><td><a class="quality-object-link" href="${objectUrl(row)}">${esc(row.name)}</a><small>${esc(row.event)} · БИН ${esc(row.bin)}</small></td><td><strong>Юридическая экспертиза ${row.level}</strong><small>${row.level === 2 ? 'Основной этап' : 'Заключительный этап'}</small></td><td>${stateBadge(row)}<strong class="quality-step">${esc(row.step)}</strong>${row.detail ? `<small>${esc(row.detail)}</small>` : ''}</td><td>${esc(row.responsible)}</td><td><a class="btn small" href="${objectUrl(row)}">Открыть объект</a></td></tr>`).join('')}</tbody></table></div>` : `<div class="quality-empty-state"><h2>${state.search.trim() ? 'Объекты не найдены' : current.emptyTitle}</h2><p>${state.search.trim() ? 'Измените условия поиска.' : current.emptyText}</p>${state.tab !== 'all' ? '<button class="btn" data-action="show-all">Показать все объекты</button>' : ''}</div>`}</section></div>`;
}
function stagePanel(object, level) {
  const item = object.stages[level];
  const step = stageStep(item, level, state.actor);
  const editableAssignment = item && state.actor === headOf(item) && ['new', 'work'].includes(item.status);
  let action = '';
  if (item && hasConclusion(item)) action = `<a class="btn small" href="${reviewUrl(item)}">Открыть заключение</a>`;
  else if (item?.assigned === state.actor && item.status === 'work') action = `<button class="btn small primary" data-action="create-conclusion" data-item="${item.id}">Создать заключение</button>`;
  return `<section class="qc-stage" aria-label="Юридическая экспертиза ${level}"><header class="qc-stage-head"><span class="qc-stage-number">${level}</span><h3>${level === 2 ? 'Основной этап' : 'Заключительный этап'}</h3><span class="tag ${item?.status || ''}">${item ? esc(STATUS[item.status]) : 'Материалы не поступили'}</span><p class="workflow-note neutral">${esc(item ? step.step : step.detail)}</p>${action}</header><div class="quality-assignment"><div class="qc-facts">${item ? `<div class="qc-fact"><span>Дело юридической экспертизы</span><strong>№ ${esc(item.id)}</strong></div>` : ''}<div class="qc-fact"><span>Руководитель юридической экспертизы</span><strong>${esc(headOf(item))}</strong>${item && state.actor === headOf(item) && !['completed', 'review'].includes(item.status) ? `<button class="qc-link" data-action="change-head" data-item="${item.id}">Изменить</button>` : ''}</div><div class="qc-fact"><span>Ответственный юрист</span><strong class="${item?.assigned ? '' : 'qc-empty'}">${esc(item?.assigned || 'Не назначен')}</strong></div><div class="qc-fact"><span>Документы этапа</span>${item ? `<details class="qc-sources"><summary>${item.documents.length} документа</summary><ul>${item.documents.map(doc => `<li><button class="qc-link" data-document="${doc.id}" data-item="${item.id}">${esc(doc.title)}</button><span>v${doc.version}</span></li>`).join('')}</ul></details>` : '<strong class="qc-empty">Пока нет</strong>'}</div></div>
  ${editableAssignment ? `<form class="qc-form" data-assignment="${item.id}"><div class="qc-form-row"><select class="select" name="expert" aria-label="${item.assigned ? 'Новый юрист' : 'Юрист'} — юридическая экспертиза ${level}"><option value="">${item.assigned ? 'Новый юрист' : 'Юрист'}: не выбран</option>${STAFF.filter(name => name !== item.assigned).map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join('')}</select><button class="btn small ${item.assigned ? '' : 'primary'}" type="submit" disabled>${item.assigned ? 'Заменить юриста' : 'Назначить юриста'}</button></div>${item.assigned ? '<label class="field">Причина замены юриста <span class="required">*</span><textarea name="reason" rows="2" placeholder="Укажите причину замены"></textarea></label>' : ''}</form>` : ''}
  ${item?.status === 'rework' ? `<div class="stage-footnote"><span>Замечания переданы аудитору. Предыдущие версии сохраняются.</span><button class="btn small" data-action="resubmit" data-item="${item.id}">Тест: получить исправления</button></div>` : ''}
  ${!item ? `<div class="stage-footnote"><span>${level === 2 && object.stages[3] ? 'Сведения о юридической экспертизе 2 в макете отсутствуют.' : 'Комплект появится после передачи документов из ВГА.'}</span><button class="text-link" data-action="receive-stage" data-level="${level}" data-object="${object.id}">Тестовая передача документов</button></div>` : ''}</div></section>`;
}
function renderObject(object) {
  main.innerHTML = `<div class="quality-registry object-workspace"><div class="page-toolbar"><button class="btn small" data-action="home">Все объекты</button><button class="btn small" data-action="object-history" data-object="${object.id}">${icon('history')}История рассмотрения</button></div><section class="qc-object"><div class="qc-object-head"><h1>${esc(object.name)}</h1><span class="tag">${object.stages[3]?.status === 'completed' ? 'Рассмотрение завершено' : 'Аудиторское мероприятие'}</span></div><div class="qc-facts"><div class="qc-fact"><span>Регистрационный номер</span><strong>${esc(object.event)}</strong></div><div class="qc-fact"><span>БИН</span><strong>${esc(object.bin)}</strong></div><div class="qc-fact qc-fact-wide"><span>Цель (предмет) аудита</span><strong>${esc(object.purpose || 'Не указана в демонстрационном комплекте')}</strong></div></div></section><h2 class="qc-section-title">Заключения юридической экспертизы</h2><div class="qc-stages">${[2, 3].map(level => stagePanel(object, level)).join('')}</div></div>`;
}
function renderDocuments(item) {
  const original = records.find(record => record.id === item.id);
  return `<section class="qc-controlled"><header class="qc-controlled-head"><div><h2>Документы на экспертизе</h2><p>${stageName(item)}: документы, которые входят в переданный комплект.</p></div><span class="qc-controlled-count">Документов: <strong>${item.documents.length}</strong></span></header><div class="table-wrap qc-controlled-table"><table><thead><tr><th>Документ</th><th>Версия на экспертизе</th><th>Текущая версия</th><th>Статус</th><th>Действие</th></tr></thead><tbody>${item.documents.map(doc => { const latest = original.documents.find(entry => entry.id === doc.id); return `<tr><td><strong>${esc(doc.title)}</strong><small>${esc(doc.number)}</small></td><td>v${doc.version}${latest?.version > doc.version ? '<span class="qc-changed">есть новая версия</span>' : ''}</td><td>v${latest?.version || doc.version}</td><td><span class="tag">${item.status === 'completed' ? 'Рассмотрен' : 'Передан на экспертизу'}</span></td><td><button class="btn small" data-document="${doc.id}">Открыть версию на экспертизе</button></td></tr>`; }).join('')}</tbody></table></div><p class="qc-controlled-empty">В макете доступны демонстрационные фрагменты. Просмотр привязан к выбранной передаче комплекта.</p></section>`;
}
function renderAssessment(item) {
  const groups = questionGroups(item); const p = progress(item);
  return `<div class="section-top"><div><h2>Правовая оценка</h2><p>Проверено ${p.reviewed} из ${p.total} критериев · замечаний: ${p.issues}</p></div><button class="btn small" data-action="directions" ${disabled(item)}>Направления проверки</button></div>${groups.map(group => `<section class="legal-check-group"><h3>${group.title}</h3>${group.questions.map(question => renderCriterion(item, question)).join('')}</section>`).join('')}<div class="info-note">${icon('info')}Дополнительные направления выбирает юрист по материалам дела. Критерии — рабочие примеры.</div>`;
}
function conclusionActions(item) {
  if (state.version !== 'current') return '<span class="subtext">Предыдущая передача · только просмотр</span>';
  if (item.status === 'review' && state.actor === headOf(item)) return `<button class="btn small" data-action="review-return">Вернуть юристу</button><button class="btn small primary" data-action="complete">Завершить экспертизу</button>`;
  if (!isReadonly(item)) return `<button class="btn small" data-action="save">${icon('save')}Сохранить черновик</button><button class="btn small primary" data-action="submit-review">Направить на рассмотрение</button>`;
  return '';
}
function renderConclusionForm(item) {
  const canEdit = !isReadonly(item);
  return `<div class="conclusion-layout"><div class="conclusion-main"><section class="surface document-panel" id="legal-general"><div class="section-top"><h2>Общая информация</h2></div><div class="qc-facts"><div class="qc-fact"><span>Уровень экспертизы</span><strong>${levelName(item)}</strong></div><div class="qc-fact"><span>Дата поступления полного комплекта</span><strong>${date(item.received)}</strong></div><div class="qc-fact"><span>Ответственный юрист</span><strong>${esc(item.assigned || 'Не назначен')}</strong></div></div></section>
  <section class="surface document-panel" id="legal-audit"><div class="section-top"><h2>Сведения об аудиторском мероприятии</h2></div><dl class="document-facts"><div><dt>Объект государственного аудита</dt><dd>${esc(item.name)}</dd></div><div><dt>БИН</dt><dd>${esc(item.bin)}</dd></div><div><dt>Регистрационный номер</dt><dd>${esc(item.event)}</dd></div><div><dt>Цель (предмет) аудита</dt><dd>${esc(item.purpose || 'Не указана в демонстрационном комплекте')}</dd></div><div><dt>Этап</dt><dd>${stageName(item)}</dd></div><div><dt>Аудитор</dt><dd>${esc(item.auditor)}</dd></div></dl></section>
  <section class="surface document-panel" id="legal-assessment">${renderAssessment(item)}</section><section class="surface document-panel" id="legal-remarks">${renderRemarks(item)}</section><section class="surface document-panel" id="legal-result">${renderResult(item)}</section><div class="document-save-bar"><span class="save-state" data-save-state>${icon('check')}${canEdit ? 'Черновик сохраняется в этом браузере' : 'Доступен просмотр заключения'}</span><div class="button-group">${conclusionActions(item)}</div></div></div>
  <aside class="conclusion-sidebar"><section class="surface"><h3>Сведения о заключении</h3><dl><dt>Дело</dt><dd>${esc(item.id)}</dd><dt>Состояние</dt><dd>${statusTag(item)}</dd><dt>Передача комплекта</dt><dd>${item.iteration}</dd><dt>Руководитель</dt><dd>${esc(headOf(item))}</dd></dl><button class="text-link" data-action="document-history">${icon('history')}История заключения</button></section><nav class="surface section-navigation" aria-label="Разделы заключения"><h3>Разделы</h3>${[['legal-general','Общая информация'],['legal-audit','Сведения об аудите'],['legal-assessment','Правовая оценка'],['legal-remarks','Замечания к документам'],['legal-result','Выводы и рекомендации']].map(([id, title]) => `<a href="#${id}" data-scroll="${id}">${title}</a>`).join('')}</nav></aside></div>`;
}
function renderDetail(original, selectedTab) {
  const object = objectFor(original); const item = viewItem(original);
  const requested = ['sources', 'documents'].includes(selectedTab) ? 'sources' : selectedTab === 'print' ? 'print' : 'form';
  const tab = state.resultView === 'print' ? 'print' : requested;
  if (!hasConclusion(original) && tab !== 'sources') { renderObject(object); return; }
  const has = hasConclusion(original);
  main.innerHTML = `<div class="quality-document-workspace"><div class="page-toolbar"><a class="btn small" href="${objectUrl(object)}">К объекту юридической экспертизы</a><button class="btn small" data-action="versions">${icon('history')}Версии комплекта</button></div><section class="surface conclusion-toolbar"><nav class="document-view-tabs" aria-label="Представление заключения"><button class="${tab === 'form' ? 'active' : ''}" aria-pressed="${tab === 'form'}" data-action="conclusion-view" data-view="form" ${!has ? 'disabled' : ''}>Форма заключения</button><button class="${tab === 'sources' ? 'active' : ''}" aria-pressed="${tab === 'sources'}" data-action="conclusion-view" data-view="sources">Документы на экспертизе</button></nav><div class="document-view-actions">${has ? `<button class="btn small ${tab === 'print' ? 'soft' : ''}" data-action="conclusion-view" data-view="print">Электронная форма</button><button class="btn small" data-action="print-word">Печать</button>` : ''}${statusTag(item)}</div><div class="conclusion-toolbar-end">${has ? `<button class="btn small" data-action="download-word">${icon('download')}Word</button>` : ''}<select class="select version-select" id="conclusion-version" aria-label="Передача комплекта"><option value="current">Передача ${original.iteration} · текущая</option>${original.versions.map((version, index) => `<option value="${index}" ${String(state.version) === String(index) ? 'selected' : ''}>Передача ${version.number} · ${date(version.time)}</option>`).join('')}</select></div></section>
  <div class="conclusion-title"><div><h1>Юридическое заключение</h1><p>${levelName(item)} · ${stageName(item).toLocaleLowerCase('ru')} · ${esc(item.id)}</p></div><span>${esc(shortName(item.assigned))}</span></div>${errorBox()}${original.status === 'review' ? `<div class="notice"><div><strong>Заключение на рассмотрении</strong>${esc(headOf(original))}${original.reviewComment ? `<p>${esc(original.reviewComment)}</p>` : ''}</div><div class="notice-actions">${conclusionActions(original)}</div></div>` : ''}${original.reviewComment && original.status === 'work' ? `<div class="notice amber"><div><strong>Замечания руководителя</strong>${esc(original.reviewComment)}</div></div>` : ''}${original.status === 'rework' ? `<div class="notice amber"><div><strong>Ожидается исправленный комплект</strong>Документы и замечания доступны для просмотра.</div><button class="btn small" data-action="resubmit">Тест: получить исправления</button></div>` : ''}${tab === 'print' ? renderWordPreview(item) : tab === 'sources' ? renderDocuments(item) : renderConclusionForm(item)}</div>`;
}
function renderCriterion(item, q) {
  const a = item.assessments[q.id] || { answer: 'pending' }; const uid = q.id; const lock = disabled(item);
  return `<article class="criterion" data-criterion="${uid}"><div class="criterion-top"><div class="criterion-text"><h4 class="criterion-title">${esc(q.title)}</h4><p>${esc(q.text)}</p></div><select class="select answer-select ${esc(a.answer)}" data-answer="${uid}" aria-label="${esc(q.title)} — оценка" ${lock}>${Object.entries(ANSWERS).map(([v, label]) => `<option value="${v}" ${a.answer === v ? 'selected' : ''}>${label}</option>`).join('')}</select></div>${a.answer === 'issue' ? `<div class="criterion-fields"><div class="form-grid"><label class="field">Документ <span class="required">*</span><select class="select" data-assess="${uid}" data-field="documentId" ${lock}><option value="">Выберите документ</option>${item.documents.map(d => `<option value="${d.id}" ${a.documentId === d.id ? 'selected' : ''}>${esc(d.title)}</option>`).join('')}</select></label><label class="field">Пункт / раздел документа <span class="required">*</span><input data-assess="${uid}" data-field="point" value="${esc(a.point)}" placeholder="Например, пункт 4" ${lock}></label><label class="field full">Замечание юриста <span class="required">*</span><textarea data-assess="${uid}" data-field="comment" placeholder="Укажите выявленное несоответствие и его обоснование" ${lock}>${esc(a.comment)}</textarea></label><label class="field full">Норма НПА <span class="required">*</span><input data-assess="${uid}" data-field="npa" value="${esc(a.npa)}" placeholder="Наименование, реквизиты НПА, статья и пункт" ${lock}></label><label class="field full">Рекомендуемое исправление <span class="required">*</span><textarea data-assess="${uid}" data-field="recommendation" placeholder="Укажите, что необходимо уточнить или исправить" ${lock}>${esc(a.recommendation)}</textarea></label></div></div>` : a.answer === 'na' ? `<div class="criterion-fields"><label class="field">Причина неприменимости <span class="required">*</span><textarea data-assess="${uid}" data-field="comment" placeholder="Поясните, почему критерий не применяется к этим материалам" ${lock}>${esc(a.comment)}</textarea></label></div>` : ''}</article>`;
}
function renderRemarks(item) {
  const list = findings(item);
  return `<div class="section-top"><div><h2>Замечания по документам</h2><p>Формируются из правовой оценки с привязкой к документу и его пункту</p></div>${list.length ? '<button class="btn small" data-action="export-remarks">' + icon('download') + 'Скачать замечания</button>' : ''}</div>${list.length ? `<div class="remarks-list">${list.map((f, index) => { const doc = item.documents.find(d => d.id === f.documentId); return `<article class="remark"><div class="remark-head"><div><h3>${index + 1}. ${esc(f.title)}</h3><div class="remark-source">${esc(doc?.title || 'Документ не выбран')} · ${f.point ? `пункт ${esc(f.point)}` : 'пункт не указан'}${doc ? ` · версия ${doc.version}` : ''}</div></div><span class="tag rework">Есть замечание</span></div><div class="remark-label">Замечание юриста</div><p>${esc(f.comment || 'Замечание ещё не заполнено')}</p><div class="remark-label">Норма НПА</div><p>${esc(f.npa || 'Не указана')}</p><div class="remark-label">Рекомендуемое исправление</div><p>${esc(f.recommendation || 'Не заполнено')}</p>${f.auditorReply ? `<div class="remark-reply"><strong>Ответ аудитора · демонстрация</strong><p>${esc(f.auditorReply)}</p></div>` : ''}${!isReadonly(item) ? `<button class="text-link" data-edit-criterion="${f.id}" style="margin-top:15px">${icon('edit')}Изменить в правовой оценке</button>` : ''}</article>`; }).join('')}</div>` : `<div class="empty-state"><div class="empty-symbol">${icon('checklist')}</div><h2>Замечания пока не зафиксированы</h2><p>При выборе «Есть замечания» в проверочном листе<br>здесь появится запись по соответствующему документу.</p><a class="btn" href="${reviewUrl(item, 'form')}">Открыть правовую оценку</a></div>`}
  ${list.length && !isReadonly(item) ? `<div class="assessment-footer"><span class="muted" style="font-size:13px">Перед передачей заполните все выбранные критерии.</span><button class="btn primary" data-action="return">Передать замечания на доработку</button></div>` : ''}`;
}
function renderWordPreview(item) {
  const model = conclusionModel(item, state.printGeneratedAt || new Date().toISOString());
  return `<div class="print-form-caption"><span class="tag">RU</span><span>Печатная форма по данным карточки · Word</span><span class="print-template-note">Рабочий шаблон</span></div><section class="word-viewer" aria-label="Просмотр печатной формы"><div class="word-viewer-toolbar"><div class="word-viewer-title">${icon('file')}<span>Юридическое заключение · ${esc(item.id)}</span></div><div class="word-viewer-controls"><button class="word-viewer-btn" data-action="print-zoom" data-step="-10" aria-label="Уменьшить масштаб" ${state.printZoom <= 50 ? 'disabled' : ''}>${icon('minus')}</button><span class="word-viewer-zoom">${state.printZoom}%</span><button class="word-viewer-btn" data-action="print-zoom" data-step="10" aria-label="Увеличить масштаб" ${state.printZoom >= 125 ? 'disabled' : ''}>${icon('plus')}</button><button class="word-viewer-btn" data-action="download-word" aria-label="Скачать заключение в Word">${icon('download')}</button><button class="word-viewer-btn" data-action="print-word" aria-label="Распечатать заключение">${icon('printer')}</button></div></div><iframe id="word-document-frame" class="word-document-frame" title="Печатная форма юридического заключения" sandbox="allow-same-origin allow-modals" srcdoc="${esc(conclusionPreviewHtml(model, state.printZoom))}"></iframe></section><div class="info-note">${icon('info')}<span>Просмотр и файл Word формируются из одних данных. Для изменения текста откройте «Форма заключения». Подписание в макете не выполняется.</span></div>`;
}
function renderResult(item) {
  return `<div class="section-top"><div><h2>Выводы и рекомендации</h2><p>Результат юридической экспертизы включается в печатную форму заключения</p></div><button class="btn small" data-action="conclusion-view" data-view="print">Электронная форма</button></div><div class="result-box"><label class="field">Общий вывод <span class="required">*</span><select class="select" id="result-outcome" ${disabled(item)}><option value="">Выберите общий вывод</option>${Object.entries(OUTCOMES).map(([value, title]) => `<option value="${value}" ${item.result.outcome === value ? 'selected' : ''}>${title}</option>`).join('')}</select></label><label class="field">Обоснование общего вывода <span class="required">*</span><textarea id="result-text" class="tall" placeholder="Опишите результат проверки, существенные замечания и рекомендации" ${disabled(item)}>${esc(item.result.text)}</textarea></label><div><label class="field">Приложения к результату</label>${!isReadonly(item) ? `<label class="upload-control" for="result-files">${icon('upload')}<span><strong>Прикрепить файл</strong><small>PDF, DOCX, XLSX, TXT, PNG, JPG · до 1 МБ на файл</small></span><input id="result-files" type="file" accept=".pdf,.docx,.xlsx,.txt,.png,.jpg,.jpeg" multiple hidden></label>` : ''}<div class="attachment-list">${(item.result.attachments || []).map((file, index) => `<div class="attachment">${icon('file')}<span>${esc(file.name)}<small class="subtext">${Math.ceil(file.size / 1024)} КБ</small></span><button class="text-link" data-download-attachment="${index}">Скачать</button>${!isReadonly(item) ? `<button class="icon-btn" data-remove-attachment="${index}" aria-label="Удалить приложение ${esc(file.name)}">${icon('close')}</button>` : ''}</div>`).join('') || '<span class="subtext">Приложений нет</span>'}</div></div></div>`;
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
  else if (route.view === 'object') { const object = objectCases(records).find(object => object.id === route.id || Object.values(object.stages).some(item => item.id === route.id)); if (object) renderObject(object); else main.innerHTML = '<div class="surface empty-state"><h1>Объект не найден</h1><button class="btn" data-action="home">К реестру</button></div>'; }
  else if (route.view === 'templates') renderTemplates(); else renderRegistry();
  renderActor();
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
}

function documentPreview(item, documentId, versionItem = null) {
  const source = versionItem || viewItem(item); const doc = source.documents.find(d => d.id === documentId); if (!doc) return;
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
async function downloadConclusionWord(item) {
  item = viewItem(item);
  const buttons = [...document.querySelectorAll('[data-action="download-word"],[data-action="export-result"]')];
  buttons.forEach(button => { button.disabled = true; });
  try {
    state.printGeneratedAt = new Date().toISOString();
    const model = conclusionModel(item, state.printGeneratedAt);
    const blob = await conclusionWord(model);
    download(conclusionFilename(model), blob, blob.type);
    toast('Печатная форма Word сформирована');
  } catch (error) { toast('Не удалось сформировать Word. Обновите страницу и повторите загрузку.'); }
  finally { buttons.forEach(button => { button.disabled = false; }); }
}
async function printConclusion(item) {
  try {
    if (state.resultView !== 'print') {
      state.resultView = 'print'; state.printGeneratedAt = new Date().toISOString(); render();
    }
    const frame = document.querySelector('#word-document-frame');
    await new Promise((resolve, reject) => {
      if (frame.contentDocument?.querySelector('.legal-document')) { resolve(); return; }
      const timeout = setTimeout(() => reject(new Error('Print preview timeout')), 7000);
      frame.addEventListener('load', () => { clearTimeout(timeout); resolve(); }, { once: true });
    });
    frame.contentWindow.focus(); frame.contentWindow.print();
  } catch (error) { toast('Не удалось открыть печать. Скачайте форму Word и распечатайте её из редактора.'); }
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


function renderActor() {
  const select = document.querySelector('#actor-select');
  select.innerHTML = ACTORS.map(actor => `<option value="${esc(actor.name)}" ${state.actor === actor.name ? 'selected' : ''}>${esc(actor.name)}${records.some(item => headOf(item) === actor.name) ? ' · руководитель' : ' · юрист'}</option>`).join('');
  document.querySelector('#actor-name').textContent = state.actor;
  const heads = records.some(item => headOf(item) === state.actor);
  document.querySelector('#actor-role').textContent = heads ? 'Руководитель правового подразделения' : 'Юрист';
  document.querySelector('#actor-avatar').textContent = state.actor.split(' ').slice(0,2).map(part => part[0]).join('');
}
function updateAssignment(form) {
  const item = records.find(record => record.id === form.dataset.assignment);
  const button = form.querySelector('button[type="submit"]');
  button.disabled = !form.elements.expert.value || Boolean(item.assigned && !form.elements.reason.value.trim());
}
document.addEventListener('submit', event => {
  const form = event.target.closest('[data-assignment]'); if (!form) return;
  event.preventDefault();
  const item = records.find(record => record.id === form.dataset.assignment);
  try { replaceRecord(assignExpert(item, form.elements.expert.value, state.actor, form.elements.reason?.value || '')); persist(); render(); toast('Ответственный юрист назначен'); } catch(error) { toast(error.message); }
});

document.addEventListener('click', async event => {
  const button = event.target.closest('button,[data-action],[data-scroll]'); if (!button || button.disabled) return;
  if (button.dataset.item) state.actionItem = button.dataset.item;
  const item = records.find(record => record.id === (button.dataset.item || (modal.contains(button) ? state.actionItem : null))) || currentItem();
  if (button.dataset.scroll) { event.preventDefault(); document.getElementById(button.dataset.scroll)?.scrollIntoView({behavior:'smooth', block:'start'}); return; }
  if (button.dataset.tab) { state.tab = button.dataset.tab; render(); return; }
  if (button.dataset.open) { navigate(reviewUrl(records.find(i => i.id === button.dataset.open))); return; }
  if (button.dataset.group) { state.reviewGroup = button.dataset.group; state.errors = []; render(); return; }
  if (button.dataset.document) { documentPreview(item, button.dataset.document); return; }
  if (button.dataset.editCriterion) { state.reviewGroup = questionGroups(item).find(g => g.questions.some(q => q.id === button.dataset.editCriterion)).id; state.resultView = 'edit'; navigate(reviewUrl(item, 'form')); requestAnimationFrame(() => document.querySelector(`[data-criterion="${button.dataset.editCriterion}"]`)?.scrollIntoView({block:'center'})); return; }
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
    case 'sidebar-collapse': { const sidebar = document.querySelector('#sidebar'); const collapsed = sidebar.classList.toggle('collapsed'); button.setAttribute('aria-expanded', String(!collapsed)); button.setAttribute('aria-label', collapsed ? 'Развернуть меню' : 'Свернуть меню'); button.querySelector('span').textContent = collapsed ? '›' : '‹'; break; }
    case 'home': state.version = 'current'; state.resultView = 'edit'; navigate('#/registry'); break;
    case 'templates': if (currentRoute().view === 'review') modalShell('О проверочных листах', '<p>Критерии помогают структурировать правовую оценку. Юрист выбирает применимые направления, проверяет документы и обосновывает замечания.</p><p>Предлагаемые вопросы требуют согласования с правовым подразделением. Их заполнение не заменяет профессиональную оценку юриста.</p>', '<button class="btn primary" data-action="close-modal">Понятно</button>'); else navigate('#/templates'); break;
    case 'close-modal': closeModal(); break;
    case 'reset-filters': Object.assign(state, { tab: 'all', search: '', level: 'all', assignee: 'all', today: false }); render(); break;
    case 'sample': openSample(); break;
    case 'confirm-sample': {
      try {
        const packet = newPacket(records, { name: document.querySelector('#sample-name').value, bin: document.querySelector('#sample-bin').value, event: document.querySelector('#sample-event').value, level: Number(document.querySelector('#sample-level').value) });
        records.unshift(packet); persist(); closeModal(); navigate(objectUrl(objectFor(packet))); toast('Демонстрационный комплект получен из ВГА');
      } catch (error) { toast(error.message); }
      break;
    }
    case 'show-all': state.tab = 'all'; render(); break;
    case 'conclusion-view': state.resultView = button.dataset.view === 'print' ? 'print' : 'edit'; state.printGeneratedAt = new Date().toISOString(); navigate(reviewUrl(item, button.dataset.view)); break;
    case 'create-conclusion': {
      try { const next = createConclusion(item, state.actor); replaceRecord(next); state.version = 'current'; state.resultView = 'edit'; persist(); navigate(reviewUrl(next)); } catch(error) { toast(error.message); }
      break;
    }
    case 'receive-stage': {
      const object = objectCases(records).find(object => object.id === button.dataset.object);
      const level = Number(button.dataset.level);
      state.receiveObject = object.id; state.receiveLevel = level;
      modalShell('Тестовая передача из ВГА', `<p>${esc(object.name)}</p><p>Создать демонстрационный комплект для юридической экспертизы ${level}? Дополнительные проверочные листы юрист выбирает самостоятельно.</p>`, '<button class="btn" data-action="close-modal">Отмена</button><button class="btn primary" data-action="confirm-receive-stage">Получить тестовый комплект</button>');
      break;
    }
    case 'confirm-receive-stage': {
      try { const object = objectCases(records).find(object => object.id === state.receiveObject); const next = newPacket(records, {...object, level: state.receiveLevel}); records.push(next); persist(); closeModal(); render(); toast('Комплект добавлен к существующему объекту'); } catch(error) { toast(error.message); }
      break;
    }
    case 'change-head':
      if (item && state.actor === headOf(item) && !['completed','review'].includes(item.status)) modalShell('Заменить руководителя юридической экспертизы', `<div class="form-grid"><label class="field full">Новый руководитель<select class="select" id="next-head"><option value="">Выберите руководителя</option>${ACTORS.filter(actor => actor.name !== headOf(item)).map(actor => `<option value="${esc(actor.name)}">${esc(actor.name)}</option>`).join('')}</select></label><label class="field full">Причина замены <span class="required">*</span><textarea id="head-reason"></textarea></label></div>`, '<button class="btn" data-action="close-modal">Отмена</button><button class="btn primary" data-action="confirm-head">Заменить руководителя</button>');
      break;
    case 'confirm-head': {
      if (!item || state.actor !== headOf(item) || ['completed','review'].includes(item.status)) break;
      const head = document.querySelector('#next-head').value; const reason = document.querySelector('#head-reason').value.trim();
      if (!ACTORS.some(actor => actor.name === head) || !reason) { toast('Выберите руководителя и укажите причину замены'); break; }
      item.head = head; addHistory(item, 'Заменён руководитель юридической экспертизы', `${head}. Причина: ${reason}`, state.actor); persist(); closeModal(); render(); break;
    }
    case 'submit-review': {
      try { replaceRecord(submitConclusion(item, state.actor)); persist(); render(); toast('Заключение направлено руководителю на рассмотрение'); } catch(error) { showErrors(error.message.split('\n')); }
      break;
    }
    case 'review-return':
      if (item?.status === 'review' && state.actor === headOf(item)) modalShell('Вернуть заключение юристу', '<label class="field">Замечания руководителя <span class="required">*</span><textarea id="review-comment" placeholder="Что требуется уточнить в заключении"></textarea></label>', '<button class="btn" data-action="close-modal">Отмена</button><button class="btn primary" data-action="confirm-review-return">Вернуть юристу</button>');
      break;
    case 'confirm-review-return': {
      if (item?.status !== 'review' || state.actor !== headOf(item)) break;
      const comment = document.querySelector('#review-comment').value.trim(); if (!comment) { toast('Заполните замечания руководителя'); break; }
      item.status = 'work'; item.reviewComment = comment; addHistory(item, 'Заключение возвращено юристу', comment, state.actor); persist(); closeModal(); render(); break;
    }
    case 'object-history': {
      const object = objectCases(records).find(object => object.id === button.dataset.object);
      const history = Object.values(object.stages).flatMap(item => item.history.map(event => ({ ...event, detail: `Юридическая экспертиза ${item.level}. ${event.detail}` }))).sort((a,b) => b.time.localeCompare(a.time));
      modalShell('История рассмотрения объекта', renderHistory({ history }), '<button class="btn" data-action="close-modal">Закрыть</button>'); break;
    }
    case 'document-history': modalShell('История заключения', renderHistory(item), '<button class="btn" data-action="close-modal">Закрыть</button>'); break;
    case 'assign': if (item && state.actor === headOf(item) && ['new','work'].includes(item.status)) openAssign(item); break;
    case 'confirm-assign': { if (!item || state.actor !== headOf(item)) return; try { replaceRecord(assignExpert(item, document.querySelector('#assign-person').value, state.actor)); } catch(error) { toast(error.message); break; } persist(); closeModal(); render(); toast('Исполнитель назначен'); break; }
    case 'directions': if (item && !isReadonly(item)) openDirections(item); break;
    case 'confirm-directions': { if (!item || isReadonly(item)) return; item.directions = [...document.querySelectorAll('input[name="direction"]:checked')].map(el => el.value); addHistory(item, 'Изменены направления проверки', item.directions.map(id => DIRECTIONS[id]).join(', ') || 'Общая правовая оценка'); state.reviewGroup = 'common'; persist(); closeModal(); render(); break; }
    case 'save': persist(true); break;
    case 'versions': openVersionList(item); break;
    case 'return': if (item && !isReadonly(item)) openReturn(item); break;
    case 'confirm-return': { if (!item || isReadonly(item)) return; const errors = assessmentErrors(item); if (errors.length || !findings(item).length) { closeModal(); showErrors(errors); return; } const comment = document.querySelector('#return-comment').value.trim(); item.status = 'rework'; addHistory(item, 'Замечания переданы на доработку', comment || `Замечаний: ${findings(item).length}. Тестовая передача.`); persist(); closeModal(); render(); toast('Комплект переведён на доработку в макете'); break; }
    case 'resubmit': if (item?.status === 'rework') modalShell('Повторная передача документов', '<p>В макете будет создана новая передача комплекта. Предыдущие документы и замечания сохранятся в версиях, а правовая оценка новой передачи начнётся заново.</p><p>Это демонстрация получения исправлений от аудитора.</p>', '<button class="btn" data-action="close-modal">Отмена</button><button class="btn primary" data-action="confirm-resubmit">Получить исправленный комплект</button>'); break;
    case 'confirm-resubmit': { if (item?.status !== 'rework') return; records[records.findIndex(r => r.id === item.id)] = resubmit(item); state.reviewGroup = 'common'; persist(); closeModal(); render(); toast('Получена новая версия. Предыдущая оценка сохранена'); break; }
    case 'complete': if (item?.status === 'review' && state.actor === headOf(item)) openComplete(item); break;
    case 'confirm-complete': { if (item?.status !== 'review' || state.actor !== headOf(item)) return; try { const next = finishReview(item); addHistory(next, 'Рассмотрение заключения завершено', 'Результат сохранён в макете; электронное подписание не выполнялось.', state.actor); replaceRecord(next); persist(); closeModal(); render(); toast('Юридическая экспертиза завершена'); } catch (error) { closeModal(); showErrors(error.message.split('\n')); } break; }
    case 'result-view': state.resultView = button.dataset.view; state.printGeneratedAt = new Date().toISOString(); state.errors = []; render(); break;
    case 'print-zoom': state.printZoom = Math.max(50, Math.min(125, state.printZoom + Number(button.dataset.step))); render(); break;
    case 'download-word':
    case 'export-result': await downloadConclusionWord(item); break;
    case 'print-word': await printConclusion(item); break;
    case 'export-remarks': exportResult(item, true); break;
    case 'export-registry': { const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`; const lines = [['Номер экспертизы', 'Объект', 'БИН', 'Мероприятие', 'Уровень', 'Статус', 'Исполнитель', 'Срок'], ...records.filter(i => matches(i)).map(i => [i.id, i.name, i.bin, i.event, levelName(i), STATUS[i.status], i.assigned, date(i.due)])]; download('Реестр-юридических-экспертиз.csv', '\uFEFF' + lines.map(line => line.map(quote).join(';')).join('\r\n'), 'text/csv;charset=utf-8'); break; }
    case 'download-document': { const p = state.previewDocument; const doc = (p.versionItem || records.find(r => r.id === p.itemId)).documents.find(d => d.id === p.documentId); download(`${doc.title}-фрагмент.txt`, '\uFEFF' + document.querySelector('.doc-preview').innerText); break; }
    case 'help': modalShell('Как работать с юридической экспертизой', '<div class="help-step"><strong>Откройте объект и назначьте юриста</strong><p>Во вкладке «Все объекты» откройте объект. Руководитель назначает юриста отдельно на экспертизу 2 или 3. Затем юрист создаёт заключение. Для демонстрации роль переключается в шапке.</p></div><div class="help-step"><strong>Изучите документы и заполните правовую оценку</strong><p>Выберите направления проверки. По каждому критерию укажите ответ; замечания свяжите с документом и пунктом.</p></div><div class="help-step"><strong>При необходимости передайте замечания на доработку</strong><p>После тестового получения исправлений можно сравнить документы и прежнюю оценку в версиях.</p></div><div class="help-step"><strong>Оформите результат</strong><p>Заполните общий вывод и направьте заключение на рассмотрение руководителю. Руководитель может вернуть его юристу или завершить экспертизу. Во вкладке «Электронная форма» можно посмотреть заключение, скачать его в Word или распечатать.</p></div><div class="info-note">' + icon('info') + 'Рабочий макет на демонстрационных данных. Подключение ВГА и подписание результата ещё не реализованы.</div>', '<button class="btn primary" data-action="close-modal">Понятно</button>'); break;
  }
});

document.addEventListener('input', event => {
  const el = event.target;
  if (el.closest('[data-assignment]')) { updateAssignment(el.closest('[data-assignment]')); return; }
  if (el.id === 'registry-search') { const start = el.selectionStart; state.search = el.value; renderRegistry(); const replacement = document.querySelector('#registry-search'); replacement.focus(); replacement.setSelectionRange(start, start); return; }
  const item = currentItem(); if (!item || isReadonly(item)) return;
  if (el.dataset.assess) { const a = item.assessments[el.dataset.assess] ||= { answer: 'pending' }; a[el.dataset.field] = el.value; }
  else if (el.id === 'result-text') item.result.text = el.value; else return;
  clearTimeout(saveTimeout); saveTimeout = setTimeout(() => persist(), 350);
});
document.addEventListener('change', async event => {
  const el = event.target;
  if (el.id === 'actor-select') { state.actor = el.value; state.errors = []; render(); return; }
  if (el.id === 'conclusion-version') { state.version = el.value; state.errors = []; state.printGeneratedAt = new Date().toISOString(); render(); return; }
  if (el.closest('[data-assignment]')) { updateAssignment(el.closest('[data-assignment]')); return; }
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
let lastReviewId = currentRoute().id;
window.addEventListener('hashchange', () => { state.errors = []; state.resultView = 'edit'; if (currentRoute().id !== lastReviewId) state.version = 'current'; lastReviewId = currentRoute().id; render(); main.scrollTo({ top: 0 }); window.scrollTo({ top: 0 }); });
window.addEventListener('pagehide', () => { if (saveTimeout) persist(); });
render();

