import {
  Archive,
  Bell,
  Ban,
  BookOpen,
  CalendarDays,
  CircleCheck,
  CircleDashed,
  ClipboardList,
  Clock3,
  DoorOpen,
  FileText,
  GraduationCap,
  History,
  LayoutDashboard,
  Plus,
  UserPlus,
  UserRound,
  UsersRound,
  Video,
  Wallet,
} from 'lucide-react';
import { getPortalKind } from '../utils/teacherMode';

const teacherSectionList = [
  { id: 'profile', label: 'Meu Perfil', icon: UserRound, first: 'teacher-info' },
  { id: 'courses', label: 'Meus Cursos', icon: BookOpen, first: 'teacher-courses' },
  { id: 'students', label: 'Estudantes', icon: UsersRound, first: 'teacher-students' },
  { id: 'online-classes', label: 'Aulas Online', icon: Video, first: 'online-classes-dashboard' },
  { id: 'finance', label: 'Finanças', icon: Wallet, first: 'finance-dashboard' },
  { id: 'tasks', label: 'Tarefas', icon: ClipboardList, first: 'tasks-dashboard' },
  { id: 'notifications', label: 'Notificações', icon: Bell, first: 'teacher-notifications' },
];

const attendance = (prefix, withRegister) => [
  { id: `${prefix}-dashboard`, label: 'Dashboard', icon: LayoutDashboard },
  ...(withRegister ? [{ id: `${prefix}-register`, label: 'Registar', icon: UserPlus }] : []),
  { id: `${prefix}-list`, label: 'Presenças', icon: ClipboardList },
  { id: `${prefix}-absences`, label: 'Faltas', icon: Ban },
  { id: `${prefix}-justified`, label: 'Justificadas', icon: CircleCheck },
  { id: `${prefix}-excesses`, label: 'Excessos', icon: UsersRound },
];

const taskStatusLinks = [
  { id: 'tasks', label: 'Todas', icon: ClipboardList },
  { id: 'tasks-todo', label: 'Por fazer', icon: CircleDashed },
  { id: 'tasks-in-progress', label: 'Em progresso', icon: Clock3 },
  { id: 'tasks-blocked', label: 'Bloqueadas', icon: Ban },
  { id: 'tasks-done', label: 'Concluídas', icon: CircleCheck },
  { id: 'tasks-archived', label: 'Arquivo', icon: Archive },
];

const teacherGroupsByArea = {
  profile: [
    { id: 'teacher-info-group', label: 'Informação', icon: UserRound,
      links: [{ id: 'teacher-info', label: 'Informação', icon: UserRound }] },
    { id: 'teacher-attendance-group', label: 'Presenças', icon: CalendarDays,
      links: attendance('staff-teachers-attendances', false) },
    { id: 'teacher-leaves-group', label: 'Pedidos de Saída', icon: DoorOpen,
      links: [
        { id: 'staff-leaves-dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'staff-leaves-request', label: 'Pedir Saída', icon: Plus },
        { id: 'staff-leaves-list', label: 'Saídas Registadas', icon: ClipboardList },
      ] },
    { id: 'teacher-documents-group', label: 'Documentos', icon: FileText,
      links: [{ id: 'teacher-documents', label: 'Expirados', icon: Ban }] },
  ],
  courses: [
    { id: 'teacher-courses-group', label: 'Meus Cursos', icon: BookOpen,
      links: [{ id: 'teacher-courses', label: 'Cursos', icon: BookOpen }] },
  ],
  students: [
    { id: 'teacher-students-group', label: 'Estudantes', icon: UsersRound,
      links: [{ id: 'teacher-students', label: 'Lista', icon: UsersRound }] },
    { id: 'student-tests', label: 'Testes', icon: ClipboardList,
      links: [
        { id: 'student-tests-dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'student-tests-assessments', label: 'Avaliações', icon: ClipboardList,
          links: [
            { id: 'student-test-create', label: 'Criar', icon: Plus },
            { id: 'student-test-manage', label: 'Gerir', icon: ClipboardList },
            { id: 'student-test-history', label: 'Histórico', icon: History },
          ] },
        { id: 'student-tests-records', label: 'Registo de Notas', icon: GraduationCap,
          links: [
            { id: 'student-records-new', label: 'Novo Registo', icon: Plus },
            { id: 'student-records-pending', label: 'Registo Pendente', icon: Clock3 },
            { id: 'student-records-grades', label: 'Notas', icon: ClipboardList },
            { id: 'student-records-history', label: 'Histórico', icon: History },
          ] },
      ] },
    { id: 'student-exams', label: 'Exames', icon: GraduationCap,
      links: [
        { id: 'student-exams-dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'student-exams-assessments', label: 'Exame', icon: ClipboardList,
          links: [
            { id: 'student-exam-create', label: 'Criar', icon: Plus },
            { id: 'student-exam-manage', label: 'Gerir', icon: ClipboardList },
            { id: 'student-exam-history', label: 'Histórico', icon: History },
          ] },
      ] },
    { id: 'student-attendances', label: 'Presenças', icon: CalendarDays,
      links: attendance('student-attendances', true) },
    { id: 'student-pautas', label: 'Pautas', icon: FileText,
      links: [
        { id: 'student-pautas-dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'student-pautas-new', label: 'Nova Pauta', icon: Plus },
        { id: 'student-pautas-list', label: 'Pautas', icon: FileText },
      ] },
  ],
  'online-classes': [
    { id: 'online-classes', label: 'Aulas Online', icon: Video,
      links: [
        { id: 'online-classes-dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'online-classes-group', label: 'Aulas', icon: Video,
          links: [
            { id: 'online-classes-register', label: 'Registar', icon: Plus },
            { id: 'online-classes-registered', label: 'Registadas', icon: ClipboardList },
          ] },
      ] },
  ],
  finance: [
    { id: 'finance-main', label: 'Dashboard', icon: LayoutDashboard,
      links: [{ id: 'finance-dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
    { id: 'finance-salaries', label: 'Salários', icon: Wallet,
      links: [
        { id: 'finance-registration-list', label: 'Registo', icon: ClipboardList },
        { id: 'finance-processing-list', label: 'Processados', icon: CircleCheck },
        { id: 'finance-pending', label: 'Pendente', icon: Clock3 },
        { id: 'finance-advance-list', label: 'Adiantados', icon: Wallet },
        { id: 'finance-debts-list', label: 'Em dívidas', icon: Ban },
        { id: 'finance-overview-reports', label: 'Relatórios', icon: FileText },
      ] },
  ],
  notifications: [
    { id: 'teacher-notifications-group', label: 'Notificações', icon: Bell,
      links: [{ id: 'teacher-notifications', label: 'Notificações', icon: Bell }] },
  ],
  tasks: [
    { id: 'tasks', label: 'Tarefas', icon: ClipboardList,
      links: [
        { id: 'tasks-dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'tasks-group', label: 'Tarefas', icon: ClipboardList, links: taskStatusLinks },
      ] },
  ],
};

// Funcionários «outros»: perfil, finanças, tarefas (com as encaminhadas) e notificações.
const otherSectionList = [
  teacherSectionList[0],
  teacherSectionList.find(({ id }) => id === 'finance'),
  teacherSectionList.find(({ id }) => id === 'tasks'),
  teacherSectionList.find(({ id }) => id === 'notifications'),
];

const otherGroupsByArea = {
  profile: [
    teacherGroupsByArea.profile[0],
    { id: 'staff-attendance-group', label: 'Presenças', icon: CalendarDays,
      links: attendance('staff-other-attendances', false) },
    teacherGroupsByArea.profile[2],
    teacherGroupsByArea.profile[3],
  ],
  finance: teacherGroupsByArea.finance,
  tasks: [
    ...teacherGroupsByArea.tasks,
    { id: 'staff-forwarded', label: 'Encaminhadas', icon: ClipboardList,
      links: [
        { id: 'staff-forwarded-todo', label: 'Por fazer', icon: CircleDashed },
        { id: 'staff-forwarded-done', label: 'Concluído', icon: CircleCheck },
      ] },
  ],
  notifications: teacherGroupsByArea.notifications,
};

const flatten = (links) =>
  links.flatMap((link) => [link, ...(link.links ? flatten(link.links) : [])]);

const isOther = () => getPortalKind() === 'other';
const sectionList = () => (isOther() ? otherSectionList : teacherSectionList);
const groupsByArea = () => (isOther() ? otherGroupsByArea : teacherGroupsByArea);

/** Áreas do menu de ícones do portal activo (professor ou funcionário «outros»). */
export const portalSections = () => sectionList();

// RH: usa o sistema geral e só ganha «Meu Perfil» (com as suas páginas pessoais).
export const hrProfileSection = teacherSectionList[0];

const hrProfileGroupList = [
  teacherGroupsByArea.profile[0],
  { id: 'hr-attendance-group', label: 'Presenças', icon: CalendarDays,
    links: attendance('profile-attendances', false) },
  { id: 'hr-leaves-group', label: 'Pedidos de Saída', icon: DoorOpen,
    links: [
      { id: 'profile-leaves-dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'profile-leaves-request', label: 'Pedir Saída', icon: Plus },
      { id: 'profile-leaves-list', label: 'Saídas Registadas', icon: ClipboardList },
    ] },
  teacherGroupsByArea.profile[3],
];

export const hrProfileGroups = hrProfileGroupList;

export const isHrProfileSection = (sectionId) =>
  flatten(hrProfileGroupList).some((link) => link.id === sectionId);

export const hrProfileLink = (sectionId) =>
  flatten(hrProfileGroupList).find((link) => link.id === sectionId)
  ?? { id: sectionId, label: 'Informação', icon: UserRound };

export const teacherGroups = (areaId) => groupsByArea()[areaId] ?? groupsByArea().profile;

export const teacherFirstSection = (areaId) =>
  sectionList().find(({ id }) => id === areaId)?.first ?? 'teacher-info';

/** Área (barra lateral) a que pertence a página activa. */
export const teacherAreaOf = (sectionId) =>
  sectionList().find(({ id }) =>
    flatten(groupsByArea()[id]).some((link) => link.id === sectionId)) ?? sectionList()[0];

export const teacherLinkOf = (sectionId) =>
  flatten(Object.values(groupsByArea()).flat()).find((link) => link.id === sectionId)
  ?? { id: sectionId, label: 'Informação', icon: UserRound };
