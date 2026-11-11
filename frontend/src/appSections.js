import { lazy } from 'react';

export const availableThemes = ['blue', 'green', 'purple', 'dark'];

export const themeStorageKey = 'cacoin.theme';

export const logoStorageKey = 'cacoin.logo';

export const staffEnrollmentPages = {
  hr: lazy(() => import('./pages/staff/hr/HrEnrollmentPage')),
  teachers: lazy(() => import('./pages/staff/teachers/TeacherEnrollmentPage')),
  other: lazy(() => import('./pages/staff/other/OtherEnrollmentPage')),
};

export const staffManagementPages = {
  hr: lazy(() => import('./pages/staff/hr/HrManagementPage')),
  teachers: lazy(() => import('./pages/staff/teachers/TeacherManagementPage')),
  other: lazy(() => import('./pages/staff/other/OtherManagementPage')),
};

export const studentSectionLabels = {
  'student-enroll': 'Inscrever',
  'student-manage': 'Gerir',
  'student-history': 'Histórico',
  'student-enrollment-pending': 'Inscrição: Pendente',
  'student-enrollment-paid': 'Inscrição: Pago',
  'student-monthly-pending': 'Mensalidades: Pendente',
  'student-monthly-overdue': 'Mensalidades: Em Atraso',
  'student-monthly-paid': 'Mensalidades: Pago',
};

export const studentFeeViews = {
  'student-monthly-pending': { feeType: 'MONTHLY', status: 'PENDING' },
  'student-monthly-overdue': { feeType: 'MONTHLY', status: 'OVERDUE' },
  'student-monthly-paid': { feeType: 'MONTHLY', status: 'PAID' },
};

export const staffTypes = {
  hr: 'Recursos Humanos',
  teachers: 'Professores',
  other: 'Outros Funcionários',
};

export const staffSection = (section) => {
  const [, type, action] = section.split('-');
  return staffTypes[type] && ['enroll', 'manage', 'history'].includes(action)
    ? { type, action }
    : null;
};

export const testRegistrationSection = (section) => {
  const match = section.match(
    /^student-tests-(normal|recovery|special)-(enroll|list)$/,
  );
  return match
    ? {
        testType: match[1].toUpperCase(),
        mode: match[2] === 'enroll' ? 'enroll' : 'list',
      }
    : null;
};

export const examRegistrationSection = (section) => {
  const match = section.match(
    /^student-exams-(normal|recurrence|special)-(enroll|list)$/,
  );
  return match
    ? {
        examType: match[1].toUpperCase(),
        mode: match[2] === 'enroll' ? 'enroll' : 'list',
      }
    : null;
};

export const uniformOrderSection = (section) => {
  const match = section.match(/^student-uniforms-(request|list)$/);
  return match ? { mode: match[1] } : null;
};

export const graduationRegistrationSection = (section) => {
  const match = section.match(/^student-graduations-(enroll|enrolled)$/);
  return match ? { mode: match[1] === 'enroll' ? 'enroll' : 'list' } : null;
};

export const suspensionSection = (section) => {
  const match = section.match(/^student-suspensions-(register|list)$/);
  return match ? { mode: match[1] } : null;
};

export const attendanceTableSection = (section) => {
  const match = section.match(
    /^student-attendances-(list|absences|justified|excesses)$/,
  );
  return match ? { mode: match[1] } : null;
};

export const financePaymentModes = {
  'finance-processing-process': 'process',
  'finance-processing-list': 'processed',
  'finance-advance-advance': 'advance',
  'finance-advance-list': 'advanced',
  'finance-debts-settle': 'settle',
};

export const financeRegistrationSection = (section) => {
  const match = section.match(/^finance-registration-(register|list)$/);
  return match ? { mode: match[1] } : null;
};

export const staffAttendanceSection = (section) => {
  const match = section.match(
    /^staff-(hr|teachers|other)-attendances-(dashboard|register|list|absences|justified|excesses)$/,
  );
  if (match) return { type: match[1], page: match[2] };
  const own = section.match(/^profile-attendances-(dashboard|list|absences|justified|excesses)$/);
  return own ? { type: 'hr', page: own[1] } : null;
};

export const expenseRecordSections = {
  'expenses-new': { kind: 'expenses', mode: 'new' },
  'expenses-list': { kind: 'expenses', mode: 'list' },
  'expenses-purchases-new': { kind: 'purchases', mode: 'new' },
  'expenses-purchases-list': { kind: 'purchases', mode: 'list' },
  'expenses-returns-pending': { kind: 'returns', mode: 'list', view: 'pending' },
  'expenses-returns-list': { kind: 'returns', mode: 'list', view: 'done' },
  'expenses-sales-new': { kind: 'sales', mode: 'new' },
  'expenses-sales-list': { kind: 'sales', mode: 'list' },
};

export const schoolSectionLabels = {
  'school-info': 'Escola',
  'school-customization': 'Customização',
  'school-report-header': 'Relatórios: Cabeçalho',
  'school-report-footer': 'Relatórios: Rodapé',
};
