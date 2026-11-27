import { STATUS, ANSWERS, OUTCOMES, questionGroups, progress, findings } from './core.js?v=f7ab02b';

const clean = value => String(value ?? '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').replace(/\r\n?/g, '\n');
const valueOr = (value, fallback = 'Не указано') => clean(value).trim() || fallback;
const escapeHtml = value => clean(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const formatDate = value => value ? new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Oral' }).format(new Date(value.includes('T') ? value : `${value}T12:00:00+05:00`)) : 'Не указана';

export function conclusionModel(item, generatedAt = new Date().toISOString()) {
  const p = progress(item);
  const completed = item.status === 'completed';
  const blocks = [];
  const paragraph = (text, options = {}) => blocks.push({ type: 'paragraph', text: clean(text), ...options });
  const heading = text => blocks.push({ type: 'heading', text });
  const field = (label, value) => blocks.push({ type: 'field', label, text: valueOr(value) });
  const table = (columns, rows, widths) => blocks.push({ type: 'table', columns, rows: rows.map(row => row.map(clean)), widths });

  paragraph(completed ? 'Результат юридической экспертизы' : 'Проект', { align: 'right', size: 11 });
  paragraph('Юридическое заключение', { style: 'Title', align: 'center' });
  paragraph(`По результатам юридической экспертизы ${item.level}`, { align: 'center', bold: true });
  paragraph(item.level === 2 ? 'Основной этап аудиторского мероприятия' : 'Заключительный этап аудиторского мероприятия', { align: 'center' });
  paragraph(`Экспертиза ${item.id}`, { align: 'center', size: 11 });

  heading('Общие сведения');
  field('Объект государственного аудита', item.name);
  field('БИН объекта', item.bin);
  field('Аудиторское мероприятие', item.event);
  field('Дата поступления материалов', formatDate(item.received));
  field('Передача комплекта документов', String(item.iteration));
  field('Состояние рассмотрения', STATUS[item.status]);

  heading('Общий вывод');
  field('Результат', OUTCOMES[item.result.outcome] || 'Общий вывод не выбран');
  paragraph(valueOr(item.result.text, 'Обоснование общего вывода не заполнено.'));

  heading('Рассмотренные документы');
  table(['Документ', 'Номер', 'Дата', 'Версия'], item.documents.map(doc => [doc.title, doc.number, formatDate(doc.date), String(doc.version)]), [3900, 3100, 1580, 1108]);

  heading('Результаты правовой оценки');
  paragraph(`Проверено критериев: ${p.reviewed} из ${p.total}. Зафиксировано замечаний: ${p.issues}.`);
  for (const group of questionGroups(item)) {
    paragraph(group.title, { bold: true, keepNext: true });
    table(['Критерий', 'Оценка'], group.questions.map(question => [question.title, ANSWERS[item.assessments[question.id]?.answer] || ANSWERS.pending]), [6880, 2808]);
    for (const question of group.questions) {
      const assessment = item.assessments[question.id];
      if (assessment?.answer === 'na') field(`Неприменимость критерия «${question.title}»`, valueOr(assessment.comment, 'Причина не заполнена'));
    }
  }

  heading('Замечания и рекомендации');
  const items = findings(item);
  if (!items.length) paragraph(p.reviewed === p.total ? 'Замечания по рассмотренным критериям не зафиксированы.' : 'На текущем этапе замечания не зафиксированы. Правовая оценка не завершена.');
  items.forEach((finding, index) => {
    const doc = item.documents.find(d => d.id === finding.documentId);
    paragraph(`Замечание ${index + 1}  ${finding.title}`, { bold: true, keepNext: true });
    field('Документ', doc ? `${doc.title}, № ${doc.number}, версия ${doc.version}` : 'Документ не выбран');
    field('Пункт или раздел', finding.point);
    field('Замечание юриста', valueOr(finding.comment, 'Замечание не заполнено'));
    field('Норма НПА', valueOr(finding.npa, 'Норма не указана'));
    field('Рекомендуемое исправление', valueOr(finding.recommendation, 'Рекомендация не заполнена'));
    if (finding.auditorReply) field('Ответ аудитора', finding.auditorReply);
  });

  if (item.result.attachments?.length) {
    heading('Приложения');
    item.result.attachments.forEach((file, index) => paragraph(`${index + 1}. ${clean(file.name)}`));
  }
  heading('Исполнитель');
  field('Юрист', valueOr(item.assigned, 'Не назначен'));
  field('Дата формирования', formatDate(generatedAt));
  if (completed) field('Дата завершения экспертизы', formatDate(item.completedAt));

  return { title: 'Юридическое заключение', id: item.id, level: item.level, draft: !completed, generatedAt, blocks };
}

export function conclusionHtml(model) {
  return model.blocks.map(block => {
    if (block.type === 'heading') return `<h2>${escapeHtml(block.text)}</h2>`;
    if (block.type === 'field') return `<p><strong>${escapeHtml(block.label)}:</strong> ${escapeHtml(block.text).replaceAll('\n', '<br>')}</p>`;
    if (block.type === 'table') {
      const total = block.widths.reduce((sum, width) => sum + width, 0);
      return `<table><colgroup>${block.widths.map(width => `<col style="width:${width / total * 100}%">`).join('')}</colgroup><thead><tr>${block.columns.map(name => `<th scope="col">${escapeHtml(name)}</th>`).join('')}</tr></thead><tbody>${block.rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell).replaceAll('\n', '<br>')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    }
    const tag = block.style === 'Title' ? 'h1' : 'p';
    return `<${tag}${block.align ? ` style="text-align:${block.align}"` : ''}>${block.bold ? '<strong>' : ''}${escapeHtml(block.text).replaceAll('\n', '<br>')}${block.bold ? '</strong>' : ''}</${tag}>`;
  }).join('\n');
}

export const PRINT_DOCUMENT_CSS = `
@page{size:letter;margin:20mm 20mm 20mm 25mm}
*{box-sizing:border-box}body{margin:0;color:#000;background:#fff}
.legal-document{font-family:"Times New Roman",Times,serif;font-size:12pt;line-height:1.15;color:#000;background:#fff;overflow-wrap:anywhere}
.legal-document h1{font-size:14pt;line-height:1.3;text-align:center;font-weight:bold;margin:0 0 12pt;color:#000}
.legal-document h2{font-size:12pt;line-height:1.3;font-weight:bold;margin:18pt 0 8pt;color:#000;break-after:avoid}
.legal-document p{margin:0 0 6pt;white-space:normal;orphans:2;widows:2}
.legal-document table{width:100%;table-layout:fixed;border-collapse:collapse;margin:8pt 0 12pt;font-size:11pt;line-height:1.15}
.legal-document th,.legal-document td{border:1px solid #d9d9d9;padding:6pt;vertical-align:middle;text-align:left;overflow-wrap:anywhere}
.legal-document th{background:#f2f2f2;color:#000;font-weight:bold}
.legal-document thead{display:table-header-group}.legal-document tr{break-inside:avoid}
@media print{body{margin:0}.legal-document{width:auto!important;min-height:0!important;padding:0!important;margin:0!important;box-shadow:none!important;zoom:1!important}}
`;

export function conclusionPrintHtml(model) {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${escapeHtml(model.title)} ${escapeHtml(model.id)}</title><style>${PRINT_DOCUMENT_CSS}</style></head><body><article class="legal-document">${conclusionHtml(model)}</article></body></html>`;
}

export function conclusionPreviewHtml(model, zoom = 80) {
  const scale = Math.max(50, Math.min(125, Number(zoom) || 80)) / 100;
  const previewCss = `body{padding:24px;background:#292b2d}.legal-document{width:816px;min-height:1056px;padding:76px 76px 76px 94px;margin:0 auto;zoom:${scale};box-shadow:0 2px 12px #0003}@media print{body{padding:0!important;background:#fff!important}}`;
  return conclusionPrintHtml(model).replace('</style>', `${previewCss}</style>`);
}

export function conclusionFilename(model) {
  return `Юридическое_заключение_${clean(model.id).replace(/[^\p{L}\p{N}_-]/gu, '_')}.docx`;
}

let enginePromise;
export async function conclusionWord(model) {
  enginePromise ||= import('./docx-9.6.1.js').then(module => module.default);
  const engine = await enginePromise;
  const { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, TableLayoutType, AlignmentType, BorderStyle, VerticalAlign, Packer } = engine;
  const runs = (text, options = {}) => clean(text).split('\n').map((line, index) => new TextRun({ text: line, ...(index ? { break: 1 } : {}), font: 'Times New Roman', color: '000000', ...options }));
  const alignments = { left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT };
  const children = model.blocks.map(block => {
    if (block.type === 'table') {
      const border = { style: BorderStyle.SINGLE, size: 6, color: 'D9D9D9' };
      return new Table({
        width: { size: 9688, type: WidthType.DXA }, columnWidths: block.widths, layout: TableLayoutType.FIXED,
        borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
        rows: [block.columns, ...block.rows].map((row, rowIndex) => new TableRow({
          tableHeader: rowIndex === 0, cantSplit: true,
          children: row.map((text, index) => new TableCell({
            width: { size: block.widths[index], type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER, margins: { top: 110, bottom: 110, left: 120, right: 120 },
            ...(rowIndex === 0 ? { shading: { fill: 'F2F2F2' } } : {}),
            children: [new Paragraph({ spacing: { after: 0, line: 260 }, children: runs(text, { size: 22, bold: rowIndex === 0 }) })]
          }))
        }))
      });
    }
    if (block.type === 'heading') return new Paragraph({ text: block.text, style: 'Heading1', keepNext: true });
    if (block.type === 'field') return new Paragraph({ children: [new TextRun({ text: `${block.label}: `, bold: true }), ...runs(block.text)] });
    return new Paragraph({ children: runs(block.text, { bold: !!block.bold, ...(block.size ? { size: block.size * 2 } : {}) }), ...(block.align ? { alignment: alignments[block.align] } : {}), ...(block.style ? { style: block.style } : {}), keepNext: !!block.keepNext });
  });
  const document = new Document({
    creator: 'SAQ', title: model.title, description: `Результат юридической экспертизы ${model.level}`,
    styles: {
      default: { document: { run: { font: 'Times New Roman', size: 24, color: '000000' }, paragraph: { spacing: { after: 100, line: 276 } } } },
      paragraphStyles: [
        { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', run: { font: 'Times New Roman', size: 28, bold: true, color: '000000' }, paragraph: { spacing: { after: 240 }, alignment: AlignmentType.CENTER } },
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', run: { font: 'Times New Roman', size: 24, bold: true, color: '000000' }, paragraph: { spacing: { before: 240, after: 120 }, keepNext: true } }
      ]
    },
    sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1418 } } }, children }]
  });
  return Packer.toBlob(document);
}
