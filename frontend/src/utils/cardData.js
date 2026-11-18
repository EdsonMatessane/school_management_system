import { toDisplayDate } from './date';
import { displayText } from './displayText';

// Cartão branco, texto azul escuro e detalhes a vermelho (igual para estudantes e funcionários).
// Padrão único: todos os cartões usam estas cores.
export const cardTheme = {
  bg: '#ffffff', bg2: '#ffffff', ink: '#1e3a8a', muted: '#64748b', accent: '#c8102e', chip: 'silver',
};

// Iniciais: primeiro nome + apelido (última palavra), p. ex. "Edson Cláudio Matessane" → EM.
const initialsOf = (name) => {
  const parts = (name ?? '').split(' ').filter(Boolean);
  if (!parts.length) return '';
  const last = parts.length > 1 ? parts[parts.length - 1] : '';
  return `${parts[0][0]}${last ? last[0] : ''}`.toUpperCase();
};

const safe = (value) => (value ? displayText(value) : '—');

const staffKinds = {
  teachers: { kind: 'teacher', label: 'Professor' },
  hr: { kind: 'hr', label: 'Recursos Humanos' },
  other: { kind: 'other', label: 'Funcionário' },
};

const academicYear = (documents) => {
  const year = (documents.enrollmentDate ?? '').slice(0, 4);
  return year || String(new Date().getFullYear());
};

export function studentCardData(documents, institution = {}) {
  const end = documents.endDate ? documents.endDate.slice(0, 7).split('-').reverse().join('/') : '—';
  return {
    kind: 'student',
    badge: 'CARTÃO DE ESTUDANTE',
    institutionName: institution.name || 'Instituição',
    subtitle: institution.slogan || '',
    logo: institution.logo || '',
    numberLabel: 'No. do Estudante',
    number: documents.code,
    name: documents.name,
    initials: initialsOf(documents.name),
    status: documents.active ? 'ESTUDANTE ACTIVO' : 'ESTUDANTE INACTIVO',
    fields: [
      { label: 'Data de Nascimento', value: documents.birthDate ? toDisplayDate(documents.birthDate) : '—' },
      { label: 'Modalidade', value: safe(documents.modalityName) },
      { label: 'Curso', value: safe(documents.courseName), wide: true },
      { label: 'Categoria', value: safe(documents.categoryName) },
      { label: 'Nível', value: safe(documents.levelName) },
    ],
    footerLeft: { label: 'Ano Académico', value: academicYear(documents) },
    footerRight: { label: 'Válido Até', value: end },
    qrText: `${documents.code}|${documents.name}|${institution.name || ''}`,
    fileName: `cartao-estudante-${documents.code}`,
    theme: cardTheme,
  };
}

export function staffCardData(staff, institution = {}) {
  const type = staffKinds[staff.staffType] ?? staffKinds.other;
  const name = [staff.firstName, staff.surname].filter(Boolean).join(' ');
  const code = String(staff.staffCode ?? '').toUpperCase();
  return {
    kind: type.kind,
    badge: 'CARTÃO DE FUNCIONÁRIO',
    institutionName: institution.name || 'Instituição',
    subtitle: institution.slogan || '',
    logo: institution.logo || '',
    numberLabel: 'Código',
    number: code,
    name,
    initials: initialsOf(name),
    status: staff.active === false ? 'FUNCIONÁRIO INACTIVO' : 'FUNCIONÁRIO ACTIVO',
    fields: [
      { label: 'Data de Nascimento', value: staff.birthDate ? toDisplayDate(staff.birthDate) : '—' },
      { label: 'Tipo', value: type.label },
      { label: 'Cargo', value: safe(staff.positionName), wide: true },
    ],
    footerLeft: { label: 'Tipo', value: type.label },
    footerRight: { label: 'Desde', value: staff.createdAt ? String(staff.createdAt).slice(0, 4) : '—' },
    qrText: `${code}|${name}|${institution.name || ''}`,
    fileName: `cartao-funcionario-${code}`,
    theme: cardTheme,
  };
}
