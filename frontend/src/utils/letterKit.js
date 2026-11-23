import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { downloadFile, drawReportFooter, drawReportHeader, singleLine } from './dataExport';
import { loadReportHeader } from './reportHeader';
import { systemDate } from './systemDate';

const NAVY = [5, 46, 94];
const INK = [25, 35, 45];

export const issueDate = () => {
  const today = systemDate();
  return [
    String(today.getDate()).padStart(2, '0'),
    String(today.getMonth() + 1).padStart(2, '0'),
    today.getFullYear(),
  ].join('/');
};

/**
 * Base das cartas em PDF (estudante e funcionário): A4 com o report header e o report footer
 * da instituição em todas as páginas, título, parágrafos, secções, tabelas e assinatura.
 */
export async function startLetter({ title, ref }) {
  const { profile, footer, logo } = await loadReportHeader();
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const textWidth = pageWidth - margin * 2;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: `${title} ${ref}` });
  const decorated = new Set();
  const decorate = () => {
    const page = doc.internal.getCurrentPageInfo().pageNumber;
    if (decorated.has(page)) return;
    decorated.add(page);
    drawReportHeader(doc, profile, logo, pageWidth);
    drawReportFooter(doc, footer, pageWidth, pageHeight);
  };
  decorate();

  let y = 44;
  const ensure = (needed) => {
    if (y + needed > pageHeight - 24) {
      doc.addPage();
      decorate();
      y = 44;
    }
  };
  const paragraph = (text, options = {}) => {
    doc.setFont('times', options.bold ? 'bold' : 'normal');
    doc.setFontSize(11.5);
    doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(text, textWidth);
    ensure(lines.length * 5.4 + 2);
    doc.text(lines, margin, y, { align: 'left', maxWidth: textWidth });
    y += lines.length * 5.4 + (options.gap ?? 3);
  };

  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text(title.toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 8;
  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(`Ref.: ${singleLine(ref)}`, margin, y);
  doc.text(`Data de emissão: ${issueDate()}`, pageWidth - margin, y, { align: 'right' });
  y += 9;

  const base = {
    margin: { top: 38, right: margin, bottom: 24, left: margin },
    didDrawPage: decorate,
    styles: {
      font: 'times', fontSize: 11, cellPadding: 1.6, textColor: INK,
      lineColor: [200, 208, 216], lineWidth: 0.15,
    },
    headStyles: {
      font: 'times', fontStyle: 'bold', fillColor: false, textColor: NAVY,
      lineColor: NAVY, lineWidth: 0.3,
    },
  };

  return {
    profile,
    institution: profile.institutionName || 'a nossa instituição',
    paragraph,
    /** Secção com pares «rótulo / valor». */
    section(sectionTitle, rows) {
      ensure(24);
      autoTable(doc, {
        ...base,
        startY: y,
        theme: 'plain',
        head: [[{ content: sectionTitle, colSpan: 2 }]],
        body: rows.map(([label, value]) => [singleLine(label), singleLine(value)]),
        columnStyles: {
          0: { cellWidth: 52, fontStyle: 'bold', textColor: [70, 85, 100] },
          1: { cellWidth: 'auto' },
        },
      });
      y = doc.lastAutoTable.finalY + 6;
    },
    /** Tabela com cabeçalho a azul: primeira coluna a negrito, segunda com a descrição. */
    grid(sectionTitle, rows, firstColumn = 40) {
      ensure(30);
      autoTable(doc, {
        ...base,
        startY: y,
        theme: 'grid',
        head: [[{ content: sectionTitle, colSpan: 2 }]],
        body: rows,
        columnStyles: { 0: { cellWidth: firstColumn, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
        alternateRowStyles: { fillColor: [245, 248, 252] },
        headStyles: { ...base.headStyles, fillColor: NAVY, textColor: [255, 255, 255] },
      });
      y = doc.lastAutoTable.finalY + 8;
    },
    /** Despedida, contactos da secretaria e linha de assinatura. */
    closing(wish) {
      const contacts = [profile.institutionPrimaryPhone, profile.institutionEmail].filter(Boolean).join(' · ');
      paragraph(
        `Em caso de dúvida, contacte a secretaria${contacts ? ` (${contacts})` : ''}. ${wish}`,
        { gap: 4 },
      );
      paragraph('Com os melhores cumprimentos,', { gap: 2 });
      ensure(26);
      y += 14;
      doc.setLineWidth(0.3);
      doc.line(margin, y, margin + 70, y);
      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      doc.text('A Secretaria', margin + 35, y + 5, { align: 'center' });
    },
    save(fileName) {
      downloadFile(doc.output('arraybuffer'), fileName, 'application/pdf');
    },
  };
}
