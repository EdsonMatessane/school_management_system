import { jsPDF } from 'jspdf';
import { nameTier } from './cardData';
import { downloadFile } from './dataExport';
import { qrMatrix } from './qrcode';

const W = 85.6;
const H = 54;
const rgb = (hex) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));

const fit = (doc, text, width) => {
  let value = String(text ?? '');
  if (doc.getTextWidth(value) <= width) return value;
  while (value.length > 1 && doc.getTextWidth(`${value}…`) > width) value = value.slice(0, -1);
  return `${value}…`;
};

const imageType = (data) => (data.startsWith('data:image/png') ? 'PNG'
  : data.startsWith('data:image/webp') ? 'WEBP' : 'JPEG');

function front(doc, card) {
  const { theme } = card;
  const accent = rgb(theme.accent);
  const ink = rgb(theme.ink);
  const muted = rgb(theme.muted);
  doc.setFillColor(...rgb(theme.bg));
  doc.rect(0, 0, W, H, 'F');
  doc.setFillColor(...accent);
  doc.rect(0, 49.5, W, H - 49.5, 'F');

  let textX = 5;
  if (card.logo) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.rect(3.5, 2.5, 10, 10, 'F');
      doc.addImage(card.logo, imageType(card.logo), 4.3, 3.3, 8.4, 8.4, undefined, 'FAST');
      textX = 15;
    } catch {
      textX = 5;
    }
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...ink);
  doc.text(fit(doc, card.institutionName.toUpperCase(), 44), textX, 6.8);
  if (card.subtitle) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(4.8);
    doc.text(fit(doc, card.subtitle, 44), textX, 10.2);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(...accent);
  doc.text(card.badge, W - 4, 7, { align: 'right' });
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.2);
  doc.line(4, 13.5, W - 4, 13.5);

  doc.setFillColor(...accent);
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.4);
  doc.roundedRect(4, 17, 19, 24, 1.2, 1.2, 'FD');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(card.initials || '?', 13.5, 31, { align: 'center' });
  doc.setFontSize(3.8);
  doc.setTextColor(...ink);
  doc.text(card.status, 13.5, 44, { align: 'center' });

  const left = 27;
  // O nome ajusta o tamanho da letra e quebra em linhas (até 3); o bloco sobe e os campos
  // descem o que for preciso para nada tocar na faixa vermelha de baixo.
  doc.setFont('helvetica', 'bold');
  const nameSize = [8, 7, 6][nameTier(card.name)];
  doc.setFontSize(nameSize);
  let nameLines = doc.splitTextToSize(card.name.toUpperCase(), 54);
  if (nameLines.length > 3) nameLines = [...nameLines.slice(0, 2), fit(doc, nameLines.slice(2).join(' '), 54)];
  const extra = nameLines.length - 1;
  const lineHeight = nameSize * 0.3528 * 1.12;
  const shift = [0, -0.6, -1.2][extra];
  const rowStep = [5.8, 5.0, 4.6][extra];
  const valueOffset = [3, 2.7, 2.4][extra];

  doc.setFontSize(4.3);
  doc.setTextColor(...muted);
  doc.text(`${card.numberLabel}:`.toUpperCase(), left, 18.2 + shift);
  doc.setFontSize(8);
  doc.setTextColor(...accent);
  doc.text(card.number, left, 21.8 + shift);
  doc.setFontSize(4.3);
  doc.setTextColor(...muted);
  doc.text('NOME:', left, 25.3 + shift);
  doc.setFontSize(nameSize);
  doc.setTextColor(...ink);
  doc.text(nameLines, left, 29 + shift, { lineHeightFactor: 1.12 });

  let y = 33.2 + shift + extra * lineHeight + (extra === 1 ? 0.4 : 0) - (extra ? 1.2 : 0);
  let column = 0;
  card.fields.forEach((field) => {
    if (field.wide && column === 1) { column = 0; y += rowStep; }
    const x = field.wide || column === 0 ? left : left + 28;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(3.8);
    doc.setTextColor(...muted);
    doc.text(`${field.label}:`.toUpperCase(), x, y);
    doc.setFontSize(6);
    doc.setTextColor(...ink);
    doc.text(fit(doc, field.value, field.wide ? 54 : 27), x, y + valueOffset);
    if (field.wide || column === 1) { column = 0; y += rowStep; } else { column = 1; }
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(255, 255, 255);
  doc.text(`${card.footerLeft.label}: ${card.footerLeft.value}`, 4, 52.6);
  doc.text(`${card.footerRight.label}: ${card.footerRight.value}`, W - 4, 52.6, { align: 'right' });
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.rect(0.1, 0.1, W - 0.2, H - 0.2);
}

function back(doc, card) {
  const { theme } = card;
  const accent = rgb(theme.accent);
  const ink = rgb(theme.ink);
  const muted = rgb(theme.muted);
  doc.setFillColor(...rgb(theme.bg));
  doc.rect(0, 0, W, H, 'F');
  doc.setFillColor(...accent);
  doc.rect(0, 5, W, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.3);
  doc.setTextColor(...muted);
  doc.text('ASSINATURA DO TITULAR', 4, 16);
  doc.setFont('helvetica', 'normal');
  doc.text(`ID: ${card.number}`, 59, 16, { align: 'right' });
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.rect(4, 17.5, 55, 8, 'FD');
  doc.setFont('times', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(...ink);
  doc.text(fit(doc, card.name, 51), 6, 23);

  const matrix = qrMatrix(card.qrText);
  const quiet = 1;
  const side = 19;
  const unit = side / (matrix.length + quiet * 2);
  const qx = W - 4 - side;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.rect(qx, 14.5, side, side, 'FD');
  doc.setFillColor(15, 23, 42);
  matrix.forEach((row, y) => row.forEach((dark, x) => {
    if (dark) {
      doc.rect(qx + (x + quiet) * unit, 14.5 + (y + quiet) * unit, unit + 0.02, unit + 0.02, 'F');
    }
  }));
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3.8);
  doc.setTextColor(...ink);
  doc.text('VALIDAÇÃO', qx + side / 2, 36, { align: 'center' });

  doc.setFontSize(4.4);
  doc.setTextColor(...ink);
  const notice = 'Este cartão é pessoal e intransmissível, constituindo propriedade exclusiva da instituição emissora. Deve ser apresentado sempre que solicitado. Em caso de extravio, o titular deve comunicar de imediato aos serviços da instituição.';
  doc.text(doc.splitTextToSize(notice, 55), 4, 30);

  doc.setDrawColor(...accent);
  doc.setLineWidth(0.2);
  doc.line(4, 46, W - 4, 46);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(...ink);
  doc.text(fit(doc, card.institutionName.toUpperCase(), 52), 4, 50.5);
  doc.setFontSize(4.5);
  doc.setTextColor(...accent);
  doc.text('EMISSÃO OFICIAL', W - 4, 50.5, { align: 'right' });
  doc.setDrawColor(203, 213, 225);
  doc.rect(0.1, 0.1, W - 0.2, H - 0.2);
}

/** Cartão em tamanho CR80 (85,6 × 54 mm): frente na página 1 e verso na página 2. */
export function exportCardToPdf(card) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [W, H], compress: true });
  doc.setProperties({ title: card.fileName });
  front(doc, card);
  doc.addPage([W, H], 'landscape');
  back(doc, card);
  downloadFile(doc.output('arraybuffer'), `${card.fileName}.pdf`, 'application/pdf');
}
