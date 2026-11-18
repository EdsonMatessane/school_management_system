import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { downloadFile, drawReportFooter, drawReportHeader, singleLine } from './dataExport';
import { toDisplayDate } from './date';
import { loadReportHeader } from './reportHeader';
import { systemDate } from './systemDate';
import { websiteLabel } from './website';

const NAVY = [5, 46, 94];
const INK = [25, 35, 45];

const portalSections = [
  ['Dashboard', 'Resumo da sua situação: presenças, notas, saldo em dívida e actividade recente.'],
  ['Minha informação', 'Os seus dados pessoais e de inscrição, a alteração da palavra-passe e a escolha do tema.'],
  ['Cursos', 'Os módulos, as disciplinas e os professores do seu curso, e as suas inscrições em testes e exames.'],
  ['Aulas online', 'As aulas marcadas, a ligação para entrar e os materiais de apoio.'],
  ['Pagamentos', 'Mensalidades e taxas por pagar, em atraso e pagas, o saldo em dívida e o histórico de pagamentos.'],
  ['Notas e Pautas', 'As notas de testes e exames e as pautas do seu curso.'],
  ['Presenças', 'O registo de presenças e faltas, com o estado da justificação.'],
  ['Pedidos', 'Fazer pedidos à secretaria (com anexos) e acompanhar o estado de cada um.'],
  ['Serviços', 'O estado das suas encomendas de uniforme, da graduação e do trancamento.'],
  ['Notificações', 'Avisos da instituição, no sino do topo do ecrã e na secção própria.'],
  ['Cartão e carta', 'O seu cartão de estudante digital e esta carta, sempre disponíveis para descarregar.'],
];

const salutation = (gender, name) => {
  if (/^f/i.test(gender ?? '')) return `Exma. Sra. ${name},`;
  if (/^m/i.test(gender ?? '')) return `Exmo. Sr. ${name},`;
  return `Caro(a) estudante ${name},`;
};

const months = (value) => (value ? `${value} ${value === 1 ? 'mês' : 'meses'}` : '—');

/** Carta de boas-vindas do estudante, com o report header e o report footer da instituição. */
export async function exportStudentLetter(documents) {
  const { profile, footer, logo } = await loadReportHeader();
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const textWidth = pageWidth - margin * 2;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: `Carta de boas-vindas ${documents.code}` });
  const decorated = new Set();
  const decorate = () => {
    const page = doc.internal.getCurrentPageInfo().pageNumber;
    if (decorated.has(page)) return;
    decorated.add(page);
    drawReportHeader(doc, profile, logo, pageWidth);
    drawReportFooter(doc, footer, pageWidth, pageHeight);
  };
  decorate();

  const institution = profile.institutionName || 'a nossa instituição';
  const today = systemDate();
  const issued = [
    String(today.getDate()).padStart(2, '0'),
    String(today.getMonth() + 1).padStart(2, '0'),
    today.getFullYear(),
  ].join('/');
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
  doc.text('CARTA DE BOAS-VINDAS', pageWidth / 2, y, { align: 'center' });
  y += 8;
  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(`Ref.: ${singleLine(documents.code)}`, margin, y);
  doc.text(`Data de emissão: ${issued}`, pageWidth - margin, y, { align: 'right' });
  y += 9;

  paragraph(salutation(documents.gender, singleLine(documents.name)), { bold: true });
  paragraph(
    `É com muito gosto que lhe damos as boas-vindas à nossa instituição (${institution}). A sua inscrição foi `
    + 'registada com sucesso e, a partir de agora, faz parte da nossa comunidade de estudantes. '
    + 'Nesta carta encontra os detalhes do seu curso, as suas credenciais de acesso ao portal do '
    + 'estudante e um resumo do que pode fazer no sistema.',
    { gap: 4 },
  );

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
  const section = (title, rows) => {
    ensure(24);
    autoTable(doc, {
      ...base,
      startY: y,
      theme: 'plain',
      head: [[{ content: title, colSpan: 2 }]],
      body: rows.map(([label, value]) => [singleLine(label), singleLine(value)]),
      columnStyles: {
        0: { cellWidth: 52, fontStyle: 'bold', textColor: [70, 85, 100] },
        1: { cellWidth: 'auto' },
      },
    });
    y = doc.lastAutoTable.finalY + 6;
  };

  section('1. Dados da inscrição', [
    ['Código de estudante', documents.code],
    ['Nome', documents.name],
    ['Curso', documents.courseName],
    ['Categoria', documents.categoryName],
    ['Nível', documents.levelName],
    ['Modalidade', documents.modalityName],
    ['Data de inscrição', documents.enrollmentDate ? toDisplayDate(documents.enrollmentDate) : '—'],
    ['Duração', months(documents.durationMonths)],
    ['Data prevista de conclusão', documents.endDate ? toDisplayDate(documents.endDate) : '—'],
    ['Estado da matrícula', documents.enrollmentStatus],
  ]);

  const origin = window.location.origin;
  section('2. Credenciais de acesso ao portal', [
    ['Endereço do portal', websiteLabel(origin)],
    ['Utilizador', documents.code],
    ['Palavra-passe inicial', 'O número de telefone indicado na inscrição, sem o prefixo +258'],
  ]);
  paragraph(
    'No primeiro acesso o sistema pede-lhe que defina uma palavra-passe pessoal, que substitui a '
    + 'inicial. Guarde-a em segurança e não a partilhe com ninguém. Depois de várias tentativas '
    + 'falhadas a conta é bloqueada; nesse caso, ou se se esquecer da palavra-passe, contacte a secretaria.',
    { gap: 5 },
  );

  ensure(30);
  autoTable(doc, {
    ...base,
    startY: y,
    theme: 'grid',
    head: [[{ content: '3. O que pode fazer no portal do estudante', colSpan: 2 }]],
    body: portalSections,
    columnStyles: { 0: { cellWidth: 40, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    headStyles: { ...base.headStyles, fillColor: NAVY, textColor: [255, 255, 255] },
  });
  y = doc.lastAutoTable.finalY + 8;

  const contacts = [profile.institutionPrimaryPhone, profile.institutionEmail].filter(Boolean).join(' · ');
  paragraph(
    `Em caso de dúvida, contacte a secretaria${contacts ? ` (${contacts})` : ''}. Desejamos-lhe `
    + 'um percurso académico de grande sucesso.',
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

  downloadFile(doc.output('arraybuffer'), `carta-boas-vindas-${documents.code}.pdf`, 'application/pdf');
}
