const escapeHtml = (value) => [...String(value ?? '')]
  .filter((character) => {
    const code = character.charCodeAt(0);
    return code === 9 || code === 10 || code === 13 || code >= 32;
  })
  .join('')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const escapeXml = (value) => escapeHtml(value);

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipFiles(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;

  files.forEach(([filename, content]) => {
    const filenameBytes = encoder.encode(filename);
    const contentBytes = encoder.encode(content);
    const checksum = crc32(contentBytes);
    const localHeader = new Uint8Array(30 + filenameBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, contentBytes.length, true);
    localView.setUint32(22, contentBytes.length, true);
    localView.setUint16(26, filenameBytes.length, true);
    localHeader.set(filenameBytes, 30);
    localParts.push(localHeader, contentBytes);

    const centralHeader = new Uint8Array(46 + filenameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, contentBytes.length, true);
    centralView.setUint32(24, contentBytes.length, true);
    centralView.setUint16(28, filenameBytes.length, true);
    centralView.setUint32(42, localOffset, true);
    centralHeader.set(filenameBytes, 46);
    centralParts.push(centralHeader);
    localOffset += localHeader.length + contentBytes.length;
  });

  const centralOffset = localOffset;
  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, centralOffset, true);

  const zipBytes = new Uint8Array(localOffset + centralSize + endRecord.length);
  let position = 0;
  [...localParts, ...centralParts, endRecord].forEach((part) => {
    zipBytes.set(part, position);
    position += part.length;
  });
  return zipBytes;
}

function readReportConfiguration() {
  const profileValue = window.localStorage.getItem(schoolProfileKey());
  const profile = profileValue ? JSON.parse(profileValue) : {};
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    throw new Error('Os dados da instituição estão num formato inválido.');
  }
  return {
    profile,
    footer: window.localStorage.getItem('cacoin.schoolReportFooter') || '',
    logo: window.localStorage.getItem('cacoin.logo') || '',
  };
}

function singleLine(value) {
  return String(value ?? '—').replace(/[\r\n\t]+/g, ' ').trim() || '—';
}

function pdfCellLines(column, row) {
  if (!column.multiline) return [singleLine(row[column.key])];
  const lines = String(row[column.key] ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.length ? lines : ['—'];
}

function pdfColumnWidths(doc, columns, rows) {
  doc.setFontSize(12);
  return columns.map((column) => {
    const { label } = column;
    doc.setFont('times', 'normal');
    const widestBodyText = rows.reduce((widest, row) => {
      const width = Math.max(...pdfCellLines(column, row).map((line) => doc.getTextWidth(line)));
      return Math.max(widest, width);
    }, 0);
    doc.setFont('times', 'bold');
    const widestText = Math.max(widestBodyText, doc.getTextWidth(singleLine(label)));
    return Math.ceil(widestText + 4);
  });
}

function drawReportHeader(doc, profile, logo, pageWidth) {
  const margin = 10;
  const logoSize = 18;
  const textX = logo ? margin + logoSize + 5 : margin;
  let textY = 8;

  if (logo) {
    const imageType = logo.startsWith('data:image/png')
      ? 'PNG'
      : logo.startsWith('data:image/webp') ? 'WEBP' : 'JPEG';
    doc.addImage(logo, imageType, margin, 6, logoSize, logoSize, undefined, 'FAST');
  }

  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text(singleLine(profile.institutionName || 'Nome da Instituição'), textX, textY);
  textY += 5;

  doc.setFont('times', 'italic');
  doc.text(singleLine(profile.institutionSlogan || 'Slogan da instituição'), textX, textY);
  textY += 5;

  doc.setFont('times', 'normal');
  doc.text(`Endereço: ${singleLine(profile.institutionAddress)}`, textX, textY);
  textY += 5;
  doc.text(`Contacto: ${singleLine(profile.institutionPrimaryPhone)}`, textX, textY);
  textY += 5;
  const emailLine = `Email: ${singleLine(profile.institutionEmail)}`;
  doc.text(
    profile.institutionWebsite
      ? `${emailLine}  |  Website: ${singleLine(websiteLabel(profile.institutionWebsite))}`
      : emailLine,
    textX,
    textY,
  );

  const separatorY = 32;
  doc.setLineWidth(0.3);
  doc.line(margin, separatorY, pageWidth - margin, separatorY);
}

function drawReportFooter(doc, footer, pageWidth, pageHeight) {
  const margin = 10;
  const separatorY = pageHeight - 17;
  doc.setLineWidth(0.3);
  doc.line(margin, separatorY, pageWidth - margin, separatorY);
  if (footer) {
    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(footer, pageWidth - margin * 2);
    doc.text(lines, margin, separatorY + 5);
  }
}

export function exportTableToPdf({ columns, rows, filename, title, details = [], secondary }) {
  if (!rows.length) throw new Error('Não há dados para exportar.');
  const { profile, footer, logo } = readReportConfiguration();
  const measureDoc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const widths = pdfColumnWidths(measureDoc, columns, rows);
  const secondaryWidths = secondary
    ? pdfColumnWidths(measureDoc, secondary.columns, secondary.rows)
    : [];
  const sumWidths = (list) => list.reduce((sum, width) => sum + width, 0);
  const margins = 20;
  const pageWidth = Math.max(
    297,
    Math.ceil(Math.max(sumWidths(widths), sumWidths(secondaryWidths)) + margins),
  );
  const pageHeight = 210;
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [pageWidth, pageHeight],
    compress: true,
  });
  doc.setFont('times', 'normal');
  doc.setFontSize(12);
  doc.setProperties({ title });
  doc.setFont('times', 'bold');
  doc.text(singleLine(title), pageWidth / 2, 39, { align: 'center' });
  doc.setFont('times', 'normal');
  // Título centrado, linha de separação, detalhes alinhados à esquerda e nova linha.
  doc.setLineWidth(0.3);
  doc.line(10, 43, pageWidth - 10, 43);
  let blockEnd = 43;
  if (details.length) {
    details.forEach(({ label, value }, index) => {
      const caption = `${label}: `;
      const y = 49 + index * 6;
      doc.setFont('times', 'bold');
      doc.text(caption, 10, y);
      const captionWidth = doc.getTextWidth(caption);
      doc.setFont('times', 'normal');
      doc.text(singleLine(value), 10 + captionWidth, y);
    });
    blockEnd = 49 + (details.length - 1) * 6 + 4;
    doc.line(10, blockEnd, pageWidth - 10, blockEnd);
  }
  const tableTop = blockEnd + 5;

  const drawTable = (tableColumns, tableRows, tableWidths, startY) => {
    autoTable(doc, {
      head: [tableColumns.map(({ label }) => singleLine(label))],
      body: tableRows.map((row) => tableColumns.map((column) => pdfCellLines(column, row).join('\n'))),
      startY,
      margin: { top: tableTop, right: 10, bottom: 22, left: 10 },
      tableWidth: 'wrap',
      columnStyles: Object.fromEntries(tableWidths.map((cellWidth, index) => [index, { cellWidth }])),
      theme: 'grid',
      styles: {
        font: 'times',
        fontStyle: 'normal',
        fontSize: 12,
        cellPadding: 1.5,
        overflow: 'visible',
        valign: 'middle',
        lineColor: [170, 180, 190],
        lineWidth: 0.15,
        textColor: [25, 35, 45],
      },
      headStyles: {
        font: 'times',
        fontStyle: 'bold',
        fontSize: 12,
        fillColor: [5, 46, 94],
        textColor: [255, 255, 255],
        lineColor: [5, 46, 94],
      },
      alternateRowStyles: { fillColor: [241, 246, 251] },
      rowPageBreak: 'avoid',
      didDrawPage: () => {
        drawReportHeader(doc, profile, logo, pageWidth);
        drawReportFooter(doc, footer, pageWidth, pageHeight);
      },
    });
  };

  drawTable(columns, rows, widths, tableTop);
  if (secondary) {
    drawTable(secondary.columns, secondary.rows, secondaryWidths, doc.lastAutoTable.finalY + 8);
  }

  downloadFile(doc.output('arraybuffer'), `${filename}.pdf`, 'application/pdf');
}

export function exportReceiptToPdf(receipt) {
  const { profile, footer, logo } = readReportConfiguration();
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: receipt.title });
  const decorated = new Set();
  const decorate = () => {
    const page = doc.internal.getCurrentPageInfo().pageNumber;
    if (decorated.has(page)) return;
    decorated.add(page);
    drawReportHeader(doc, profile, logo, pageWidth);
    drawReportFooter(doc, footer, pageWidth, pageHeight);
  };
  decorate();

  doc.setFont('times', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(5, 46, 94);
  doc.text(singleLine(receipt.title), pageWidth / 2, 43, { align: 'center' });
  doc.setTextColor(25, 35, 45);
  doc.setFontSize(11);
  doc.setFont('times', 'normal');
  doc.text(`Recibo N.º ${singleLine(receipt.number)}`, margin, 51);
  doc.text(`Data de emissão: ${singleLine(formatDate(receipt.issueDate))}`, pageWidth - margin, 51, { align: 'right' });
  doc.text(`Estado: ${singleLine(receipt.status)}`, margin, 56);

  const baseOptions = {
    margin: { top: 38, right: margin, bottom: 22, left: margin },
    didDrawPage: decorate,
    styles: {
      font: 'times',
      fontSize: 11,
      cellPadding: 1.6,
      textColor: [25, 35, 45],
      lineColor: [200, 208, 216],
      lineWidth: 0.15,
    },
    headStyles: {
      font: 'times',
      fontStyle: 'bold',
      fillColor: false,
      textColor: [5, 46, 94],
      lineColor: [5, 46, 94],
      lineWidth: 0.3,
    },
  };
  let y = 61;
  const advance = () => { y = doc.lastAutoTable.finalY + 6; };

  receipt.sections.forEach((section) => {
    autoTable(doc, {
      ...baseOptions,
      startY: y,
      theme: 'plain',
      head: [[{ content: singleLine(section.title), colSpan: 2 }]],
      body: section.rows.map(([label, value]) => [singleLine(label), singleLine(value)]),
      columnStyles: {
        0: { cellWidth: 48, fontStyle: 'bold', textColor: [70, 85, 100] },
        1: { cellWidth: 'auto' },
      },
    });
    advance();
  });

  const alignOf = (column) => (column.align === 'right' ? 'right' : 'left');
  autoTable(doc, {
    ...baseOptions,
    startY: y,
    theme: 'grid',
    head: [receipt.columns.map((column) => ({
      content: singleLine(column.label),
      styles: { halign: alignOf(column) },
    }))],
    body: receipt.items.map((item) => receipt.columns.map((column) => singleLine(item[column.key]))),
    foot: [receipt.columns.map((column) => ({
      content: String(receipt.totals[column.key] ?? '').trim(),
      styles: { halign: alignOf(column) },
    }))],
    showFoot: 'lastPage',
    columnStyles: Object.fromEntries(receipt.columns.map((column, index) => [
      index,
      { halign: alignOf(column) },
    ])),
    footStyles: {
      font: 'times',
      fontStyle: 'bold',
      fillColor: [225, 236, 247],
      textColor: [5, 46, 94],
    },
    alternateRowStyles: { fillColor: [245, 248, 252] },
  });
  advance();

  if (receipt.payments?.length) {
    autoTable(doc, {
      ...baseOptions,
      startY: y,
      theme: 'grid',
      head: [['Data', 'Descrição', 'Método', 'Referência', { content: 'Valor', styles: { halign: 'right' } }]],
      body: receipt.payments.map((payment) => [
        singleLine(formatDate(payment.date)),
        singleLine(payment.description),
        singleLine(payment.method),
        singleLine(payment.reference),
        singleLine(payment.amount),
      ]),
      columnStyles: { 4: { halign: 'right' } },
      alternateRowStyles: { fillColor: [245, 248, 252] },
    });
    advance();
  } else {
    doc.setFont('times', 'italic');
    doc.text('Ainda não existem pagamentos registados.', margin, y);
    y += 8;
  }

  if (y > pageHeight - 55) {
    doc.addPage();
    decorate();
    y = 50;
  }
  y += 18;
  doc.setLineWidth(0.3);
  doc.line(margin + 8, y, margin + 78, y);
  doc.line(pageWidth - margin - 78, y, pageWidth - margin - 8, y);
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text('O Estudante', margin + 43, y + 5, { align: 'center' });
  doc.text('A Secretaria', pageWidth - margin - 43, y + 5, { align: 'center' });

  downloadFile(doc.output('arraybuffer'), `${receipt.filename}.pdf`, 'application/pdf');
}

export function exportTableToCsv({ columns, rows, filename, title, details = [], secondary }) {
  const quote = (value) => {
    const text = String(value ?? '');
    const safeText = text !== '-' && /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safeText.replaceAll('"', '""')}"`;
  };
  const content = [
    [quote(title), ...columns.slice(1).map(() => '')].join(','),
    ...details.map(({ label, value }) => (
      [quote(`${label}: ${value}`), ...columns.slice(1).map(() => '')].join(',')
    )),
    columns.map(({ label }) => quote(label)).join(','),
    ...rows.map((row) => columns.map(({ key }) => quote(row[key])).join(',')),
    ...(secondary ? [
      '',
      secondary.columns.map(({ label }) => quote(label)).join(','),
      ...secondary.rows.map((row) => secondary.columns.map(({ key }) => quote(row[key])).join(',')),
    ] : []),
  ].join('\r\n');
  downloadFile(`\uFEFF${content}`, `${filename}.csv`, 'text/csv;charset=utf-8');
}

export function exportTableToXml({ columns, rows, filename, title, details = [], secondary }) {
  const headers = columns.map(({ key, label }) => (
    `<Column name="${escapeXml(key)}" label="${escapeXml(label)}"/>`
  )).join('');
  const records = rows.map((row) => (
    `<Record>${columns.map(({ key }) => (
      `<Field name="${escapeXml(key)}">${escapeXml(row[key] ?? '')}</Field>`
    )).join('')}</Record>`
  )).join('');
  const secondaryXml = secondary ? `<Secondary><Columns>${secondary.columns.map(({ key, label }) => (
    `<Column name="${escapeXml(key)}" label="${escapeXml(label)}"/>`
  )).join('')}</Columns><Records>${secondary.rows.map((row) => (
    `<Record>${secondary.columns.map(({ key }) => (
      `<Field name="${escapeXml(key)}">${escapeXml(row[key] ?? '')}</Field>`
    )).join('')}</Record>`
  )).join('')}</Records></Secondary>` : '';
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Export title="${escapeXml(title)}"><Title>${escapeXml(title)}</Title>${details.length ? `<Details>${details.map(({ label, value }) => `<Detail label="${escapeXml(label)}">${escapeXml(value)}</Detail>`).join('')}</Details>` : ''}<Columns>${headers}</Columns><Records>${records}</Records>${secondaryXml}</Export>`;
  downloadFile(`\uFEFF${xml}`, `${filename}.xml`, 'application/xml;charset=utf-8');
}

export function exportTableToExcel({ columns, rows, filename, title, details = [], secondary }) {
  const cell = (address, value, style) => (
    `<c r="${address}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`
  );
  const columnName = (index) => {
    let number = index + 1;
    let name = '';
    while (number > 0) {
      const remainder = (number - 1) % 26;
      name = String.fromCharCode(65 + remainder) + name;
      number = Math.floor((number - 1) / 26);
    }
    return name;
  };
  const lastColumn = columnName(columns.length - 1);
  const titleRow = `<row r="1">${cell(`A1`, title, 3)}</row>`;
  const offset = details.length;
  const detailRows = details.map(({ label, value }, index) => (
    `<row r="${index + 2}">${cell(`A${index + 2}`, `${label}: ${value}`, 3)}</row>`
  )).join('');
  const headerRowNumber = offset + 2;
  const headerRow = `<row r="${headerRowNumber}">${columns.map(({ label }, index) => (
    cell(`${columnName(index)}${headerRowNumber}`, label, 1)
  )).join('')}</row>`;
  const dataRows = rows.map((row, rowIndex) => {
    const rowNumber = rowIndex + 3 + offset;
    return `<row r="${rowNumber}">${columns.map(({ key }, columnIndex) => (
      cell(`${columnName(columnIndex)}${rowNumber}`, row[key] ?? '', 2)
    )).join('')}</row>`;
  }).join('');
  const secondaryStart = rows.length + 4 + offset;
  const secondaryRows = secondary ? `<row r="${secondaryStart}">${secondary.columns.map(({ label }, index) => (
    cell(`${columnName(index)}${secondaryStart}`, label, 1)
  )).join('')}</row>${secondary.rows.map((row, rowIndex) => {
    const rowNumber = secondaryStart + 1 + rowIndex;
    return `<row r="${rowNumber}">${secondary.columns.map(({ key }, columnIndex) => (
      cell(`${columnName(columnIndex)}${rowNumber}`, row[key] ?? '', 2)
    )).join('')}</row>`;
  }).join('')}` : '';
  const lastRow = secondary ? secondaryStart + secondary.rows.length : rows.length + 2 + offset;
  const dimensionColumn = columnName(Math.max(columns.length, secondary?.columns.length ?? 0) - 1);
  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${dimensionColumn}${lastRow}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="${headerRowNumber}" topLeftCell="A${headerRowNumber + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><sheetData>${titleRow}${detailRows}${headerRow}${dataRows}${secondaryRows}</sheetData><mergeCells count="${offset + 1}">${Array.from({ length: offset + 1 }, (_, index) => `<mergeCell ref="A${index + 1}:${lastColumn}${index + 1}"/>`).join('')}</mergeCells><autoFilter ref="A${headerRowNumber}:${lastColumn}${rows.length + headerRowNumber}"/></worksheet>`;
  const files = [
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`],
    ['docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${escapeXml(title)}</dc:title></cp:coreProperties>`],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Estudantes" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="12"/><name val="Times New Roman"/><family val="1"/></font><font><b/><sz val="12"/><name val="Times New Roman"/><family val="1"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9EAF7"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`],
    ['xl/worksheets/sheet1.xml', worksheet],
  ];
  downloadFile(
    zipFiles(files),
    `${filename}.xlsx`,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
}
import { schoolProfileKey } from './institution';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from './date';
import { websiteLabel } from './website';
