import { Fragment, useEffect, useState } from 'react';
import {
  Landmark,
  Smartphone,
  FileClock,
  KeyRound,
  Lock,
  UserCog,
  UserX,
  BookOpen,
  BookText,
  Building2,
  CalendarClock,
  CalendarDays,
  Tags,
  ClipboardList,
  ClipboardPen,
  Archive,
  Ban,
  CircleCheck,
  CircleDashed,
  Clock3,
  LayoutDashboard,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  FolderTree,
  GraduationCap,
  Layers,
  LogOut,
  FileText,
  Plus,
  Search,
  Paintbrush,
  Receipt,
  CreditCard,
  Wallet,
  UserRound,
  UserPlus,
  UsersRound,
  BriefcaseBusiness,
  History,
  Package,
  Settings,
  School,
  Video,
  ExternalLink,
  Bell,
  DoorOpen,
  HandCoins,
  MessageCircle,
  MessageSquareText,
  ShoppingCart,
  TrendingUp,
  Undo2,
  Percent,
  Split,
  Radio,
} from 'lucide-react';
import { Badge, IconButton, Tooltip } from '@mui/material';
import TeacherNotificationDialog, {
  readTeacherSeen,
  teacherSeenEvent,
} from '../pages/teacher/TeacherNotificationDialog';
import {
  getOnlineClassPlatforms,
  getSystemSettings,
  getTaskNotifications,
  getTeacherNotifications,
} from '../services/api';
import { getSystemYear } from '../utils/systemDate';
import { getAuthToken, getSchoolProfile, setAuthToken } from '../services/api';
import { getApiBase, readInstitutionOptions } from '../utils/institution';
import {
  teacherAreaOf,
  teacherFirstSection,
  teacherGroups,
  teacherLinkOf,
  portalSections,
  hrProfileGroups,
  hrProfileLink,
  hrProfileSection,
  isHrProfileSection,
} from './teacherNav';

const sections = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'courses', label: 'Gestão de Cursos', icon: BookOpen },
  { id: 'students', label: 'Estudantes', icon: UsersRound },
  { id: 'online-classes', label: 'Aulas Online', icon: Video },
  { id: 'staff', label: 'Funcionários', icon: BriefcaseBusiness },
  { id: 'finance', label: 'Finanças', icon: Wallet },
  { id: 'expenses', label: 'Despesas', icon: HandCoins },
  { id: 'notifications', label: 'Notificações', icon: Bell },
  { id: 'mobile-money', label: 'Mobile Money', icon: Smartphone },
  { id: 'users', label: 'Usuários', icon: UserCog },
  { id: 'folders', label: 'Pastas', icon: FolderTree },
  { id: 'tasks', label: 'Tarefas', icon: ClipboardList },
  { id: 'search', label: 'Pesquisa', icon: Search },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

const courseLinks = [
  { id: 'courses', label: 'Cursos', icon: BookOpen },
  { id: 'categories', label: 'Categorias', icon: Tags },
  { id: 'levels', label: 'Níveis', icon: GraduationCap },
  { id: 'modalities', label: 'Modalidades', icon: Layers },
  { id: 'monthlyfees', label: 'Mensalidades', icon: CalendarDays },
  { id: 'enrollmentfees', label: 'Taxas de Inscrição', icon: Receipt },
  { id: 'manualfees', label: 'Taxas de Manual', icon: BookText },
];

const onlineClassesLinks = [
  { id: 'online-classes-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    id: 'online-classes-group',
    label: 'Aulas',
    icon: Video,
    links: [
      { id: 'online-classes-register', label: 'Registar', icon: Plus },
      {
        id: 'online-classes-registered',
        label: 'Registadas',
        icon: ClipboardList,
      },
    ],
  },
];

const moduleLinks = [
  { id: 'modules', label: 'Módulos', icon: BookOpen },
  { id: 'disciplines', label: 'Disciplinas', icon: BookText },
];

const studentLinks = [
  { id: 'student-enroll', label: 'Inscrever', icon: UserPlus },
  { id: 'student-manage', label: 'Gerir', icon: UsersRound },
  { id: 'student-history', label: 'Histórico', icon: History },
];

const studentEnrollmentLinks = [
  { id: 'student-enrollment-pending', label: 'Pendente', icon: Clock3 },
  { id: 'student-enrollment-paid', label: 'Pago', icon: CircleCheck },
];

const studentMonthlyFeeLinks = [
  { id: 'student-monthly-pending', label: 'Pendente', icon: Clock3 },
  { id: 'student-monthly-overdue', label: 'Em Atraso', icon: Ban },
  { id: 'student-monthly-paid', label: 'Pago', icon: CircleCheck },
];

const studentTestLinks = [
  { id: 'student-tests-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    id: 'student-tests-registration',
    label: 'Inscrição',
    icon: UserPlus,
    links: [
      {
        id: 'student-tests-normal',
        label: 'Teste Normal',
        links: [
          {
            id: 'student-tests-normal-enroll',
            label: 'Inscrever',
            icon: UserPlus,
          },
          {
            id: 'student-tests-normal-list',
            label: 'Inscritos',
            icon: ClipboardList,
          },
        ],
      },
      {
        id: 'student-tests-recovery',
        label: 'Teste de Recuperação',
        links: [
          {
            id: 'student-tests-recovery-enroll',
            label: 'Inscrever',
            icon: UserPlus,
          },
          {
            id: 'student-tests-recovery-list',
            label: 'Inscritos',
            icon: ClipboardList,
          },
        ],
      },
      {
        id: 'student-tests-special',
        label: 'Teste Especial',
        links: [
          {
            id: 'student-tests-special-enroll',
            label: 'Inscrever',
            icon: UserPlus,
          },
          {
            id: 'student-tests-special-list',
            label: 'Inscritos',
            icon: ClipboardList,
          },
        ],
      },
    ],
  },
  {
    id: 'student-tests-assessments',
    label: 'Avaliações',
    icon: ClipboardPen,
    links: [
      { id: 'student-test-create', label: 'Criar', icon: Plus },
      { id: 'student-test-manage', label: 'Gerir', icon: ClipboardList },
      { id: 'student-test-history', label: 'Histórico', icon: History },
    ],
  },
  {
    id: 'student-tests-records',
    label: 'Registo de Notas',
    icon: ClipboardList,
    links: [
      { id: 'student-records-new', label: 'Novo Registo', icon: Plus },
      { id: 'student-records-pending', label: 'Registo Pendente', icon: Clock3 },
      { id: 'student-records-grades', label: 'Notas', icon: ClipboardList },
      { id: 'student-records-history', label: 'Histórico', icon: History },
    ],
  },
];

const examRegistrationLinks = [
  { type: 'normal', label: 'Exame Normal' },
  { type: 'recurrence', label: 'Exame de Recorrência' },
  { type: 'special', label: 'Exame Especial' },
].map(({ type, label }) => ({
  id: `student-exams-${type}`,
  label,
  links: [
    { id: `student-exams-${type}-enroll`, label: 'Inscrever', icon: UserPlus },
    {
      id: `student-exams-${type}-list`,
      label: 'Inscritos',
      icon: ClipboardList,
    },
  ],
}));
const studentExamLinks = [
  { id: 'student-exams-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    id: 'student-exams-registration',
    label: 'Inscrição',
    icon: UserPlus,
    links: examRegistrationLinks,
  },
  {
    id: 'student-exams-assessments',
    label: 'Exame',
    icon: ClipboardPen,
    links: [
      { id: 'student-exam-create', label: 'Criar', icon: Plus },
      { id: 'student-exam-manage', label: 'Gerir', icon: ClipboardList },
      { id: 'student-exam-history', label: 'Histórico', icon: History },
    ],
  },
];

const studentUniformLinks = [
  {
    id: 'student-uniforms-dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'student-uniforms-orders',
    label: 'Pedidos',
    icon: ClipboardList,
    links: [
      { id: 'student-uniforms-request', label: 'Requisitar', icon: UserPlus },
      {
        id: 'student-uniforms-list',
        label: 'Requisitados',
        icon: ClipboardList,
      },
    ],
  },
];

const studentGraduationLinks = [
  {
    id: 'student-graduations-dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'student-graduations-registration',
    label: 'Inscrição',
    icon: UserPlus,
    links: [
      { id: 'student-graduations-enroll', label: 'Inscrever', icon: UserPlus },
      {
        id: 'student-graduations-enrolled',
        label: 'Inscritos',
        icon: ClipboardList,
      },
    ],
  },
  {
    id: 'student-graduations-ceremony',
    label: 'Graduação',
    icon: GraduationCap,
  },
  {
    id: 'student-graduations-graduates',
    label: 'Formados',
    icon: CircleCheck,
  },
];

const studentSuspensionLinks = [
  {
    id: 'student-suspensions-dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  { id: 'student-suspensions-register', label: 'Registar', icon: UserPlus },
  {
    id: 'student-suspensions-list',
    label: 'Trancados',
    icon: ClipboardList,
  },
];
const studentAttendanceLinks = [
  {
    id: 'student-attendances-dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  { id: 'student-attendances-register', label: 'Registar', icon: UserPlus },
  {
    id: 'student-attendances-list',
    label: 'Presenças',
    icon: ClipboardList,
  },
  { id: 'student-attendances-absences', label: 'Faltas', icon: Ban },
  {
    id: 'student-attendances-justified',
    label: 'Justificadas',
    icon: CircleCheck,
  },
  { id: 'student-attendances-excesses', label: 'Excessos', icon: UsersRound },
];

const studentPautaLinks = [
  { id: 'student-pautas-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'student-pautas-new', label: 'Nova Pauta', icon: Plus },
  { id: 'student-pautas-list', label: 'Pautas', icon: FileText },
];

const studentRequestLinks = [
  { id: 'student-requests-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'student-requests-new', label: 'Novo Pedido', icon: Plus },
  { id: 'student-requests-pending', label: 'Pendentes', icon: Clock3 },
  { id: 'student-requests-list', label: 'Pedidos', icon: ClipboardList },
  { id: 'student-requests-rejected', label: 'Rejeitados', icon: Ban },
];

const studentFeatureGroups = [
  {
    id: 'student-tests',
    label: 'Testes',
    icon: ClipboardList,
    links: studentTestLinks,
  },
  {
    id: 'student-exams',
    label: 'Exames',
    icon: BookText,
    links: studentExamLinks,
  },
  {
    id: 'student-uniforms',
    label: 'Uniforme',
    icon: Tags,
    links: studentUniformLinks,
  },
  {
    id: 'student-graduation',
    label: 'Graduação',
    icon: GraduationCap,
    links: studentGraduationLinks,
  },
  {
    id: 'student-suspension',
    label: 'Trancamento',
    icon: Ban,
    links: studentSuspensionLinks,
  },
  {
    id: 'student-absences',
    label: 'Presenças',
    icon: CalendarDays,
    links: studentAttendanceLinks,
  },
  {
    id: 'student-reports',
    label: 'Pautas',
    icon: FileText,
    links: studentPautaLinks,
  },
  {
    id: 'student-requests',
    label: 'Pedidos',
    icon: ClipboardList,
    links: studentRequestLinks,
  },
];

const studentMenuLinks = [
  {
    id: 'student-group',
    label: 'Estudantes',
    icon: UsersRound,
    links: studentLinks,
  },
  {
    id: 'student-enrollment-group',
    label: 'Inscrição',
    icon: UserPlus,
    links: studentEnrollmentLinks,
  },
  {
    id: 'student-monthly-group',
    label: 'Mensalidades',
    icon: CalendarDays,
    links: studentMonthlyFeeLinks,
  },
  ...studentFeatureGroups,
];
const flattenLinks = (links) =>
  links.flatMap((link) => [
    link,
    ...(link.links ? flattenLinks(link.links) : []),
  ]);
const studentSectionLinks = [
  ...studentLinks,
  ...studentEnrollmentLinks,
  ...studentMonthlyFeeLinks,
  ...flattenLinks(studentTestLinks),
  ...flattenLinks(studentExamLinks),
  ...flattenLinks(studentUniformLinks),
  ...flattenLinks(studentGraduationLinks),
  ...flattenLinks(studentSuspensionLinks),
  ...flattenLinks(studentAttendanceLinks),
  ...flattenLinks(studentPautaLinks),
  ...studentRequestLinks,
];

const staffAttendanceLinks = (type) => [
  { id: `staff-${type}-attendances-dashboard`, label: 'Dashboard', icon: LayoutDashboard },
  { id: `staff-${type}-attendances-register`, label: 'Registar', icon: UserPlus },
  { id: `staff-${type}-attendances-list`, label: 'Presenças', icon: ClipboardList },
  { id: `staff-${type}-attendances-absences`, label: 'Faltas', icon: Ban },
  { id: `staff-${type}-attendances-justified`, label: 'Justificadas', icon: CircleCheck },
  { id: `staff-${type}-attendances-excesses`, label: 'Excessos', icon: UsersRound },
];

const staffActions = [
  { action: 'enroll', label: 'Inscrever', icon: UserPlus },
  { action: 'manage', label: 'Gerir', icon: UsersRound },
  { action: 'history', label: 'Histórico', icon: History },
];
const staffDocumentsGroup = {
  id: 'staff-group-documents',
  label: 'Documentos',
  icon: FileText,
  links: [
    { id: 'staff-documents-types', label: 'Documentos', icon: FileText },
    { id: 'staff-documents-expiring', label: 'A Expirar', icon: Clock3 },
    { id: 'staff-documents-expired', label: 'Expirados', icon: Ban },
  ],
};

const staffLeaveGroup = {
  id: 'staff-group-leaves',
  label: 'Pedidos de Saída',
  icon: DoorOpen,
  links: [
    { id: 'staff-leaves-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'staff-leaves-request', label: 'Pedir Saída', icon: Plus },
    { id: 'staff-leaves-list', label: 'Saídas Registadas', icon: ClipboardList },
  ],
};

const staffLinks = [
  { id: 'hr', label: 'RH' },
  { id: 'teachers', label: 'Professores' },
  { id: 'other', label: 'Outros' },
].map(({ id, label }) => ({
  id: `staff-group-${id}`,
  label,
  icon: BriefcaseBusiness,
  links: [
    ...staffActions.map(({ action, label: actionLabel, icon }) => ({
      id: `staff-${id}-${action}`,
      label: actionLabel,
      icon,
    })),
    {
      id: `staff-${id}-attendances`,
      label: 'Presenças',
      icon: CalendarDays,
      links: staffAttendanceLinks(id),
    },
  ],
})).concat([staffDocumentsGroup, staffLeaveGroup]);

const financeGroups = [
  {
    id: 'finance-main',
    label: 'Dashboard',
    icon: LayoutDashboard,
    links: [
      { id: 'finance-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    id: 'finance-salaries',
    label: 'Salários',
    icon: Wallet,
    links: [
      {
        id: 'finance-registration',
        label: 'Cadastro',
        icon: UserPlus,
        links: [
          { id: 'finance-registration-register', label: 'Registar', icon: UserPlus },
          { id: 'finance-registration-list', label: 'Registados', icon: ClipboardList },
        ],
      },
      {
        id: 'finance-processing',
        label: 'Processamento',
        icon: Wallet,
        links: [
          { id: 'finance-processing-process', label: 'Processar', icon: Wallet },
          { id: 'finance-processing-list', label: 'Processados', icon: ClipboardList },
        ],
      },
      { id: 'finance-pending', label: 'Pendente', icon: Clock3 },
      {
        id: 'finance-advance',
        label: 'Adiantamento',
        icon: Wallet,
        links: [
          { id: 'finance-advance-advance', label: 'Adiantar', icon: Wallet },
          { id: 'finance-advance-list', label: 'Adiantados', icon: ClipboardList },
        ],
      },
      {
        id: 'finance-debts',
        label: 'Dívidas',
        icon: Ban,
        links: [
          { id: 'finance-debts-list', label: 'Em dívidas', icon: Ban },
          { id: 'finance-debts-settle', label: 'Liquidar', icon: CircleCheck },
        ],
      },
      {
        id: 'finance-overview',
        label: 'Visão Geral',
        icon: FileText,
        links: [
          { id: 'finance-overview-reports', label: 'Relatórios', icon: FileText },
        ],
      },
    ],
  },
];

const expenseGroups = [
  {
    id: 'expenses-group-main',
    label: 'Despesas',
    icon: HandCoins,
    links: [
      { id: 'expenses-dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'expenses-new', label: 'Nova Despesa', icon: Plus },
      { id: 'expenses-list', label: 'Despesas', icon: ClipboardList },
    ],
  },
  {
    id: 'expenses-group-purchases',
    label: 'Compras',
    icon: ShoppingCart,
    links: [
      { id: 'expenses-purchases-new', label: 'Nova compra', icon: Plus },
      { id: 'expenses-purchases-list', label: 'Compras', icon: ClipboardList },
    ],
  },
  {
    id: 'expenses-group-returns',
    label: 'Devolução',
    icon: Undo2,
    links: [
      { id: 'expenses-returns-new', label: 'Devolução', icon: Plus },
      { id: 'expenses-returns-pending', label: 'Pendente', icon: Clock3 },
      { id: 'expenses-returns-list', label: 'Devolvidos', icon: ClipboardList },
    ],
  },
  {
    id: 'expenses-group-sales',
    label: 'Vendas',
    icon: TrendingUp,
    links: [
      { id: 'expenses-sales-new', label: 'Nova Venda', icon: Plus },
      { id: 'expenses-sales-list', label: 'Vendas', icon: ClipboardList },
    ],
  },
];

const notificationGroups = [
  {
    id: 'notifications-main',
    label: 'Dashboard',
    icon: LayoutDashboard,
    links: [
      { id: 'notifications-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    id: 'notifications-messages',
    label: 'WhatsApp/SMS',
    icon: MessageCircle,
    links: [
      { id: 'notifications-whatsapp', label: 'WhatsApp', icon: MessageCircle },
      { id: 'notifications-sms', label: 'SMS', icon: MessageSquareText },
    ],
  },
];

const taskStatusLinks = [
  { id: 'tasks', label: 'Todas', icon: ClipboardList },
  { id: 'tasks-todo', label: 'Por fazer', icon: CircleDashed },
  { id: 'tasks-in-progress', label: 'Em progresso', icon: Clock3 },
  { id: 'tasks-blocked', label: 'Bloqueadas', icon: Ban },
  { id: 'tasks-done', label: 'Concluídas', icon: CircleCheck },
  { id: 'tasks-archived', label: 'Arquivo', icon: Archive },
];

const taskLinks = [
  { id: 'tasks-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    id: 'tasks-group',
    label: 'Tarefas',
    icon: ClipboardList,
    links: taskStatusLinks,
  },
];

const settingsLinks = [
  { id: 'settings', label: 'Geral', icon: Settings },
  { id: 'settings-form', label: 'Formulário', icon: UserPlus },
];

const staffSettingsLinks = [
  { id: 'staff-form', label: 'Formulário', icon: UserPlus },
];

const paymentSettingsLinks = [
  { id: 'payment-methods', label: 'Métodos', icon: CreditCard },
  { id: 'payment-period', label: 'Período', icon: CalendarClock },
];

const testSettingsLinks = [
  { id: 'settings-tests-definition', label: 'Definição', icon: Settings },
  { id: 'settings-tests-statuses', label: 'Estados', icon: CircleCheck },
  { id: 'settings-tests-periods', label: 'Períodos', icon: CalendarClock },
];
const testSettingsGroup = {
  id: 'test-settings',
  label: 'Testes',
  icon: ClipboardPen,
  links: testSettingsLinks,
};

const examSettingsLinks = [
  { id: 'settings-exams-definition', label: 'Definição', icon: Settings },
  { id: 'settings-exams-statuses', label: 'Estados', icon: CircleCheck },
  { id: 'settings-exams-periods', label: 'Períodos', icon: CalendarClock },
];
const examSettingsGroup = {
  id: 'exam-settings',
  label: 'Exames',
  icon: BookText,
  links: examSettingsLinks,
};

const uniformSettingsLinks = [
  { id: 'settings-uniforms-definition', label: 'Definição', icon: Settings },
  { id: 'settings-uniforms-stock', label: 'Stock', icon: Package },
  { id: 'settings-uniforms-statuses', label: 'Estados', icon: CircleCheck },
];
const uniformSettingsGroup = {
  id: 'uniform-settings',
  label: 'Uniforme',
  icon: Tags,
  links: uniformSettingsLinks,
};

const graduationSettingsLinks = [
  { id: 'settings-graduations-definition', label: 'Definição', icon: Settings },
  { id: 'settings-graduations-statuses', label: 'Estados', icon: CircleCheck },
  { id: 'settings-graduations-periods', label: 'Períodos', icon: CalendarClock },
];
const graduationSettingsGroup = {
  id: 'graduation-settings',
  label: 'Graduação',
  icon: GraduationCap,
  links: graduationSettingsLinks,
};

const suspensionSettingsLinks = [
  { id: 'settings-suspensions-definition', label: 'Definição', icon: Settings },
  { id: 'settings-suspensions-statuses', label: 'Estados', icon: CircleCheck },
];
const suspensionSettingsGroup = {
  id: 'suspension-settings',
  label: 'Trancamento',
  icon: Ban,
  links: suspensionSettingsLinks,
};

const pautaSettingsLinks = [
  { id: 'settings-pautas-periods', label: 'Períodos', icon: CalendarClock },
  { id: 'settings-pautas-results', label: 'Resultados', icon: CircleCheck },
];
const pautaSettingsGroup = {
  id: 'pauta-settings',
  label: 'Pautas',
  icon: FileText,
  links: pautaSettingsLinks,
};

const financeSettingsLinks = [
  { id: 'settings-finance-definition', label: 'Definição', icon: Settings },
  { id: 'settings-finance-periods', label: 'Períodos', icon: CalendarClock },
  { id: 'settings-finance-statuses', label: 'Estados', icon: CircleCheck },
];
const financeSettingsGroup = {
  id: 'finance-settings',
  label: 'Finanças',
  icon: Wallet,
  links: financeSettingsLinks,
};
const positionSettingsLinks = [
  { id: 'settings-positions-list', label: 'Cargos', icon: BriefcaseBusiness },
];
const positionSettingsGroup = {
  id: 'position-settings',
  label: 'Cargos',
  icon: BriefcaseBusiness,
  links: positionSettingsLinks,
};

const onlineClassesSettingsLinks = [
  { id: 'settings-online-classes-definition', label: 'Definição', icon: Settings },
  { id: 'settings-online-classes-statuses', label: 'Estados', icon: CircleCheck },
];
const onlineClassesSettingsGroup = {
  id: 'online-classes-settings',
  label: 'Aulas Online',
  icon: Video,
  links: onlineClassesSettingsLinks,
};
const onlineAttendanceSettingsLinks = [
  { id: 'settings-online-attendance-definition', label: 'Definição', icon: Settings },
  { id: 'settings-online-attendance-statuses', label: 'Estados', icon: CircleCheck },
];
const onlineAttendanceSettingsGroup = {
  id: 'online-attendance-settings',
  label: 'Presenças',
  icon: UsersRound,
  links: onlineAttendanceSettingsLinks,
};

const fineSettingsLinks = [
  { id: 'settings-fines-definition', label: 'Definição', icon: Settings },
];
const fineSettingsGroup = {
  id: 'fine-settings',
  label: 'Multas',
  icon: Percent,
  links: fineSettingsLinks,
};

const partitionSettingsLinks = [
  { id: 'settings-partitions-definition', label: 'Repartição', icon: Settings },
];
const partitionSettingsGroup = {
  id: 'partition-settings',
  label: 'Repartição',
  icon: Split,
  links: partitionSettingsLinks,
};

const leaveSettingsLinks = [
  { id: 'settings-leaves-definition', label: 'Definição', icon: Settings },
  { id: 'settings-leaves-statuses', label: 'Estados', icon: CircleCheck },
];
const leaveSettingsGroup = {
  id: 'leave-settings',
  label: 'Pedidos de Saída',
  icon: DoorOpen,
  links: leaveSettingsLinks,
};
const mobileMoneyGroups = [
  {
    id: 'mobile-money-main',
    label: 'Mobile Money',
    icon: Smartphone,
    links: [
      { id: 'mobile-money-pay', label: 'Novo Pagamento', icon: Plus },
      { id: 'mobile-money-pending', label: 'Pendentes', icon: Clock3 },
      { id: 'mobile-money-done', label: 'Efectuados', icon: CircleCheck },
      { id: 'mobile-money-failed', label: 'Falhados', icon: Ban },
    ],
  },
];
const searchGroups = [
  {
    id: 'search-main',
    label: 'Pesquisa',
    icon: Search,
    links: [{ id: 'search-student', label: 'Estudante', icon: UserRound }],
  },
];
const dashboardGroups = [
  {
    id: 'dashboard-main',
    label: 'Dashboard',
    icon: LayoutDashboard,
    links: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
];
const userStatusLinks = (prefix) => [
  { id: `${prefix}-dashboard`, label: 'Dashboard', icon: LayoutDashboard },
  { id: `${prefix}-active`, label: 'Activos', icon: CircleCheck },
  { id: `${prefix}-inactive`, label: 'Inactivos', icon: Ban },
  { id: `${prefix}-locked`, label: 'Autobloqueio', icon: Lock },
  { id: `${prefix}-finished`, label: 'Terminados', icon: UserX },
];
const userGroups = [
  {
    id: 'users-main',
    label: 'Dashboard',
    icon: LayoutDashboard,
    links: [{ id: 'users-dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    id: 'users-students',
    label: 'Alunos',
    icon: UsersRound,
    links: userStatusLinks('users-students'),
  },
  {
    id: 'users-staff',
    label: 'Funcionários',
    icon: BriefcaseBusiness,
    links: userStatusLinks('users-staff'),
  },
];
const mobileMoneySettingsLinks = [
  { id: 'settings-mobile-money-wallets', label: 'Carteiras', icon: Wallet },
  { id: 'settings-mobile-money-banks', label: 'Bancos', icon: Landmark },
  { id: 'settings-mobile-money-statuses', label: 'Estados', icon: CircleCheck },
];
const mobileMoneySettingsGroup = {
  id: 'mobile-money-settings',
  label: 'Mobile Money',
  icon: Smartphone,
  links: mobileMoneySettingsLinks,
};
const userSettingsLinks = [
  { id: 'settings-users-admins', label: 'Administrador do Sistema', icon: UserCog },
  { id: 'settings-users-password', label: 'Palavra-passe', icon: KeyRound },
  { id: 'settings-users-access', label: 'Acesso', icon: Clock3 },
  { id: 'settings-users-statuses', label: 'Estados', icon: CircleCheck },
  { id: 'settings-users-logs', label: 'User Logs', icon: FileClock },
];
const userSettingsGroup = {
  id: 'user-settings',
  label: 'Usuários',
  icon: UserCog,
  links: userSettingsLinks,
};
const requestSettingsLinks = [
  { id: 'settings-requests-types', label: 'Tipos de Pedidos', icon: ClipboardList },
  { id: 'settings-requests-notifications', label: 'Notificações', icon: Bell },
  { id: 'settings-requests-statuses', label: 'Estados', icon: CircleCheck },
];
const requestSettingsGroup = {
  id: 'request-settings',
  label: 'Pedidos',
  icon: ClipboardList,
  links: requestSettingsLinks,
};
const expenseSettingsLinks = [
  { id: 'settings-expenses-definition', label: 'Definição', icon: Settings },
  { id: 'settings-expenses-statuses', label: 'Estados', icon: CircleCheck },
];
const expenseSettingsGroup = {
  id: 'expense-settings',
  label: 'Despesas',
  icon: HandCoins,
  links: expenseSettingsLinks,
};
const notificationSettingsLinks = [
  { id: 'settings-notifications-whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { id: 'settings-notifications-sms', label: 'SMS', icon: MessageSquareText },
  { id: 'settings-notifications-statuses', label: 'Estados', icon: CircleCheck },
];
const notificationSettingsGroup = {
  id: 'notification-settings',
  label: 'Notificações',
  icon: Bell,
  links: notificationSettingsLinks,
};

const schoolReportLinks = [
  { id: 'school-report-header', label: 'Cabeçalho', icon: FileText },
  { id: 'school-report-footer', label: 'Rodapé', icon: FileText },
];

const schoolLinks = [
  { id: 'school-info', label: 'Escola', icon: Building2 },
  { id: 'school-customization', label: 'Customização', icon: Paintbrush },
  {
    id: 'school-reports',
    label: 'Relatórios',
    icon: FileText,
    links: schoolReportLinks,
  },
];

const findLinkPath = (links, targetId, parents = []) => {
  for (const link of links) {
    const path = [...parents, link];
    if (link.id === targetId) return path;
    if (link.links) {
      const nestedPath = findLinkPath(link.links, targetId, path);
      if (nestedPath) return nestedPath;
    }
  }
  return null;
};

/** Professor: as suas notificações; restantes utilizadores: comentários nas tarefas deles. */
const notificationLoader = (teacher) => (teacher
  ? getTeacherNotifications
  : () => getTaskNotifications().then((result) => ({
    items: (result?.items ?? []).map((item) => ({ ...item, id: `admin:${item.id}` })),
  })));

// Portal de RH: Meu Perfil + as áreas do sistema geral (sem Dashboard, Usuários, Pastas e Configurações).
const hrHiddenSections = ['dashboard', 'users', 'folders', 'settings'];
// Nome da instituição em uso: o do perfil da escola ou, em falta, o da lista de instituições.
const currentInstitutionName = () => {
  try {
    const name = getSchoolProfile().institutionName;
    if (name) return name;
  } catch {
    // perfil ilegível: usa a lista de instituições
  }
  return readInstitutionOptions().find((item) => item.apiBase === getApiBase())?.name ?? '';
};

const hrSections = [
  hrProfileSection,
  ...sections.filter(({ id }) => !hrHiddenSections.includes(id)),
];

export default function Layout({
  children,
  activeSection,
  onSectionChange,
  logo,
  teacher = false,
  hr = false,
}) {
  const hrPersonal = hr && isHrProfileSection(activeSection);
  const [configuredPlatforms, setConfiguredPlatforms] = useState([]);
  const [platformLoadError, setPlatformLoadError] = useState('');
  const [teacherUnread, setTeacherUnread] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  useEffect(() => {
    let active = true;
    const load = () => notificationLoader(teacher)()
      .then((result) => {
        if (!active) return;
        const seen = readTeacherSeen();
        setTeacherUnread(result.items.filter((item) => !seen.has(item.id)).length);
      })
      .catch(() => {});
    load();
    const timer = window.setInterval(load, 120000);
    window.addEventListener(teacherSeenEvent, load);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener(teacherSeenEvent, load);
    };
  }, [teacher]);
  useEffect(() => {
    let mounted = true;
    const loadPlatforms = () => {
      getOnlineClassPlatforms()
        .then((platforms) => {
          if (!mounted) return;
          setConfiguredPlatforms(platforms.filter((item) => item.url?.trim()));
          setPlatformLoadError('');
        })
        .catch(() => {
          if (mounted) {
            setPlatformLoadError('Não foi possível carregar as plataformas.');
          }
        });
    };
    // No portal de RH, as páginas pessoais não carregam as plataformas (pedido limitado ao próprio).
    if (!hrPersonal) loadPlatforms();
    window.addEventListener('online-class-platforms-updated', loadPlatforms);
    return () => {
      mounted = false;
      window.removeEventListener(
        'online-class-platforms-updated',
        loadPlatforms,
      );
    };
  }, [hrPersonal]);

  const platformLabels = {
    GOOGLE_MEET: 'Google Meet',
    ZOOM: 'Zoom',
    TEAMS: 'Microsoft Teams',
    OTHER: 'Outro',
  };
  const onlinePlatformLinks = configuredPlatforms.map(({ platform }) => ({
    id: `online-platform-${platform}`,
    label: platformLabels[platform] || platform,
    icon: ExternalLink,
  }));
  const onlineClassesNavigationLinks = [
    ...onlineClassesLinks,
    {
      id: 'online-classes-platforms',
      label: 'Plataformas',
      icon: Video,
      links: onlinePlatformLinks,
    },
  ];
  const isFolderSection = activeSection === 'folders';
  const isOnlineClassesSection = flattenLinks(onlineClassesNavigationLinks).some(
    (link) => link.id === activeSection,
  );
  const isTasksSection =
    activeSection === 'tasks-dashboard' ||
    taskStatusLinks.some(({ id }) => id === activeSection);
  const isSettingsSection = settingsLinks.some(
    (link) => link.id === activeSection,
  );
  const isStaffSettingsSection = staffSettingsLinks.some(
    (link) => link.id === activeSection,
  );
  const isStaffSection = staffLinks.some((group) =>
    flattenLinks(group.links).some((link) => link.id === activeSection),
  );
  const isPaymentSettingsSection = paymentSettingsLinks.some(
    (link) => link.id === activeSection,
  );
  const isTestSettingsSection = testSettingsLinks.some(
    (link) => link.id === activeSection,
  );
  const isExamSettingsSection = examSettingsLinks.some(
    (link) => link.id === activeSection,
  );
  const isUniformSettingsSection = uniformSettingsLinks.some(
    (link) => link.id === activeSection,
  );
  const isGraduationSettingsSection = graduationSettingsLinks.some(
    (link) => link.id === activeSection,
  );
  const isSuspensionSettingsSection = suspensionSettingsLinks.some(
    (link) => link.id === activeSection,
  );
  const isPautaSettingsSection = pautaSettingsLinks.some(
    (link) => link.id === activeSection,
  );
  const isFinanceSection = flattenLinks(financeGroups).some(
    (link) => link.id === activeSection,
  );
  const isFinanceSettingsSection = financeSettingsLinks.some(
    (link) => link.id === activeSection,
  );
  const isPositionSettingsSection = positionSettingsLinks.some(
    (link) => link.id === activeSection,
  );
  const isOnlineClassesSettingsSection = onlineClassesSettingsLinks.some(
    (link) => link.id === activeSection,
  );
  const isOnlineAttendanceSettingsSection = onlineAttendanceSettingsLinks.some(
    (link) => link.id === activeSection,
  );
  const isPartitionSettingsSection = partitionSettingsLinks.some(
    (link) => link.id === activeSection,
  );
  const isFineSettingsSection = fineSettingsLinks.some(
    (link) => link.id === activeSection,
  );
  const isLeaveSettingsSection = leaveSettingsLinks.some(
    (link) => link.id === activeSection,
  );
  const isMobileMoneySettingsSection = mobileMoneySettingsLinks.some(
    (link) => link.id === activeSection,
  );
  const isUserSettingsSection = userSettingsLinks.some(
    (link) => link.id === activeSection,
  );
  const isDashboardSection = activeSection === 'dashboard';
  const isSearchSection = flattenLinks(searchGroups).some(
    (link) => link.id === activeSection,
  );
  const isMobileMoneySection = flattenLinks(mobileMoneyGroups).some(
    (link) => link.id === activeSection,
  );
  const isUsersSection = flattenLinks(userGroups).some(
    (link) => link.id === activeSection,
  );
  const isRequestSettingsSection = requestSettingsLinks.some(
    (link) => link.id === activeSection,
  );
  const isExpenseSettingsSection = expenseSettingsLinks.some(
    (link) => link.id === activeSection,
  );
  const isNotificationSettingsSection = notificationSettingsLinks.some(
    (link) => link.id === activeSection,
  );
  const isExpensesSection = flattenLinks(expenseGroups).some(
    (link) => link.id === activeSection,
  );
  const isNotificationsSection = flattenLinks(notificationGroups).some(
    (link) => link.id === activeSection,
  );
  const isSchoolSection =
    schoolLinks.some((link) => link.id === activeSection) ||
    schoolReportLinks.some((link) => link.id === activeSection);
  const isSettingsArea =
    isSettingsSection ||
    isSchoolSection ||
    isStaffSettingsSection ||
    isPaymentSettingsSection ||
    isTestSettingsSection ||
    isExamSettingsSection ||
    isUniformSettingsSection ||
    isGraduationSettingsSection ||
    isSuspensionSettingsSection ||
    isPautaSettingsSection ||
    isFinanceSettingsSection ||
    isFineSettingsSection ||
    isPartitionSettingsSection ||
    isPositionSettingsSection ||
    isOnlineClassesSettingsSection ||
    isOnlineAttendanceSettingsSection ||
    isLeaveSettingsSection ||
    isRequestSettingsSection ||
    isUserSettingsSection ||
    isMobileMoneySettingsSection ||
    isExpenseSettingsSection ||
    isNotificationSettingsSection;
  const isStudentSection = studentSectionLinks.some(
    (link) => link.id === activeSection,
  );
  const generalArea = isSchoolSection
    ? { id: 'settings', label: 'Minha Escola', icon: School }
    : sections.find(
        ({ id }) =>
          id ===
          (isFolderSection
            ? 'folders'
            : isFinanceSection
              ? 'finance'
              : isExpensesSection
                ? 'expenses'
                : isNotificationsSection
                  ? 'notifications'
                  : isDashboardSection
                    ? 'dashboard'
                  : isSearchSection
                    ? 'search'
                  : isMobileMoneySection
                    ? 'mobile-money'
                  : isUsersSection
                    ? 'users'
                  : isTasksSection
              ? 'tasks'
              : isSettingsSection ||
                  isStaffSettingsSection ||
                  isPaymentSettingsSection ||
                  isTestSettingsSection ||
                  isExamSettingsSection ||
                  isUniformSettingsSection ||
                  isGraduationSettingsSection ||
                  isSuspensionSettingsSection ||
                  isPautaSettingsSection ||
                  isFinanceSettingsSection ||
                  isFineSettingsSection ||
                  isPartitionSettingsSection ||
                  isPositionSettingsSection ||
                  isOnlineClassesSettingsSection ||
                  isOnlineAttendanceSettingsSection ||
                  isLeaveSettingsSection ||
                  isRequestSettingsSection ||
                  isUserSettingsSection ||
                  isMobileMoneySettingsSection ||
                  isExpenseSettingsSection ||
                  isNotificationSettingsSection
                ? 'settings'
                : isStudentSection
                  ? 'students'
                  : isOnlineClassesSection
                    ? 'online-classes'
                    : isStaffSection
                      ? 'staff'
                      : 'courses'),
      );
  // RH: «Meu Perfil» é a única área nova; o resto é o sistema geral.
  const hrProfile = hr && isHrProfileSection(activeSection);
  const activeArea = teacher ? teacherAreaOf(activeSection) : hrProfile ? hrProfileSection : generalArea;
  const generalLink = isSettingsArea
    ? [
        ...settingsLinks,
        ...staffSettingsLinks,
        ...paymentSettingsLinks,
        ...testSettingsLinks,
        ...examSettingsLinks,
        ...uniformSettingsLinks,
        ...graduationSettingsLinks,
        ...suspensionSettingsLinks,
        ...pautaSettingsLinks,
        ...financeSettingsLinks,
        ...fineSettingsLinks,
        ...partitionSettingsLinks,
        ...positionSettingsLinks,
        ...onlineClassesSettingsLinks,
        ...onlineAttendanceSettingsLinks,
        ...leaveSettingsLinks,
        ...requestSettingsLinks,
        ...userSettingsLinks,
        ...mobileMoneySettingsLinks,
        ...expenseSettingsLinks,
        ...notificationSettingsLinks,
        ...schoolLinks,
        ...schoolReportLinks,
      ].find((link) => link.id === activeSection)
    : ([
        ...courseLinks,
        ...moduleLinks,
        ...studentSectionLinks,
        ...flattenLinks(onlineClassesNavigationLinks),
        ...staffLinks.flatMap((group) => flattenLinks(group.links)),
        ...taskLinks,
        ...taskStatusLinks,
        ...flattenLinks(financeGroups),
        ...flattenLinks(expenseGroups),
        ...flattenLinks(notificationGroups),
        ...flattenLinks(userGroups),
        ...flattenLinks(dashboardGroups),
        ...flattenLinks(searchGroups),
        ...flattenLinks(mobileMoneyGroups),
      ].find((link) => link.id === activeSection) ??
      (isStaffSection
        ? staffLinks[0].links[0]
        : isStudentSection
          ? studentLinks[0]
          : courseLinks[0]));
  const activeLink = teacher
    ? teacherLinkOf(activeSection)
    : hrProfile ? hrProfileLink(activeSection) : generalLink;
  const ActiveAreaIcon = activeArea.icon;
  const generalMenuGroups = isSettingsArea
    ? [
        {
          id: 'settings',
          label: 'Configurações',
          icon: Settings,
          links: settingsLinks,
        },
        {
          id: 'school',
          label: 'Minha Escola',
          icon: School,
          links: schoolLinks,
        },
        {
          id: 'staff-settings',
          label: 'Funcionários',
          icon: BriefcaseBusiness,
          links: staffSettingsLinks,
        },
        {
          id: 'payment-settings',
          label: 'Pagamentos',
          icon: Wallet,
          links: paymentSettingsLinks,
        },
        testSettingsGroup,
        examSettingsGroup,
        uniformSettingsGroup,
        graduationSettingsGroup,
        suspensionSettingsGroup,
        pautaSettingsGroup,
        financeSettingsGroup,
        fineSettingsGroup,
        partitionSettingsGroup,
        positionSettingsGroup,
        onlineClassesSettingsGroup,
        onlineAttendanceSettingsGroup,
        leaveSettingsGroup,
        requestSettingsGroup,
        userSettingsGroup,
        mobileMoneySettingsGroup,
        expenseSettingsGroup,
        notificationSettingsGroup,
      ]
    : isStudentSection
      ? studentMenuLinks
      : isOnlineClassesSection
        ? [
            {
              id: 'online-classes',
              label: activeArea.label,
              icon: ActiveAreaIcon,
              links: onlineClassesNavigationLinks,
            },
          ]
        : isStaffSection
          ? [
              {
                id: 'staff',
                label: activeArea.label,
                icon: ActiveAreaIcon,
                links: staffLinks,
              },
            ]
          : isFinanceSection
            ? financeGroups
            : isExpensesSection
              ? expenseGroups
              : isNotificationsSection
                ? notificationGroups
                : isDashboardSection
                  ? dashboardGroups
                : isSearchSection
                  ? searchGroups
                : isMobileMoneySection
                  ? mobileMoneyGroups
                : isUsersSection
                  ? userGroups
            : isTasksSection
            ? [
                {
                  id: 'tasks',
                  label: activeArea.label,
                  icon: ActiveAreaIcon,
                  links: taskLinks,
                },
              ]
            : [
                {
                  id: 'courses',
                  label: activeArea.label,
                  icon: ActiveAreaIcon,
                  links: courseLinks,
                },
                {
                  id: 'modules',
                  label: 'Unidade Curricular',
                  icon: Layers,
                  links: moduleLinks,
                },
              ];
  const menuGroups = teacher
    ? teacherGroups(activeArea.id)
    : hrProfile ? hrProfileGroups : generalMenuGroups;
  const breadcrumbParents = (() => {
    for (const group of menuGroups) {
      const path = findLinkPath(group.links, activeSection);
      if (path)
        return [group.label, ...path.slice(0, -1).map(({ label }) => label)];
    }
    return [];
  })();
  // Caminho completo: área > expansível > (sub-expansível) > página, sem repetir nomes.
  const breadcrumbTrail = (
    isFolderSection
      ? [activeArea.label, 'Gestão de pastas']
      : [activeArea.label, ...breadcrumbParents, activeLink.label]
  ).filter((label, index, trail) => label !== trail[index - 1]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());
  // Todos os expansíveis começam fechados e voltam a fechar ao mudar de área.
  useEffect(() => {
    setExpandedGroups(new Set());
  }, [activeArea.id]);
  const [clockNow, setClockNow] = useState(() => new Date());
  const [systemSettings, setSystemSettings] = useState({
    timeZone: 'Africa/Maputo',
    locale: 'pt-MZ',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '24h',
  });

  useEffect(() => {
    getSystemSettings()
      .then(setSystemSettings)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(
      () => setClockNow(new Date()),
      15_000,
    );
    return () => window.clearInterval(intervalId);
  }, []);

  const locale = systemSettings.locale || 'pt-MZ';
  const timeZone = systemSettings.timeZone || 'Africa/Maputo';
  const dateParts = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone,
  }).formatToParts(clockNow);
  const dateValues = Object.fromEntries(
    dateParts.map(({ type, value }) => [type, value]),
  );
  const institutionName = currentInstitutionName();
  const weekday = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    timeZone,
  }).format(clockNow);
  const systemYearValue = getSystemYear();
  const displayYear = systemYearValue && systemYearValue < Number(dateValues.year)
    ? String(systemYearValue)
    : dateValues.year;
  const currentDate = `${dateValues.day}/${dateValues.month}/${displayYear}`;
  const currentTime = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: systemSettings.timeFormat === '12h',
    timeZone,
  }).format(clockNow);

  const toggleGroup = (id) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleMainGroup = (id) => {
    setExpandedGroups((current) =>
      current.has(id) ? new Set() : new Set([id]),
    );
  };

  const renderLinkTree = (links) =>
    links.map(({ id, label, icon: Icon, links: nestedLinks }) => (
      <div key={id}>
        {nestedLinks ? (
          <button
            type="button"
            className="cacoin-sidebar-link cacoin-sidebar-group"
            aria-expanded={expandedGroups.has(id)}
            onClick={() => toggleGroup(id)}
          >
            {Icon && <Icon size={16} aria-hidden="true" />}
            <span>{label}</span>
            <ChevronDown
              className={expandedGroups.has(id) ? '' : 'collapsed'}
              size={16}
              aria-hidden="true"
            />
          </button>
        ) : (
          <button
            type="button"
            className={`cacoin-sidebar-link${activeSection === id ? ' active' : ''}`}
            aria-current={activeSection === id ? 'page' : undefined}
            onClick={() => onSectionChange(id)}
          >
            {Icon && <Icon size={16} aria-hidden="true" />}
            <span>{label}</span>
          </button>
        )}
        {nestedLinks && expandedGroups.has(id) && (
          <div className="cacoin-sidebar-submenu">
            {renderLinkTree(nestedLinks)}
          </div>
        )}
      </div>
    ));

  return (
    <div
      className={`cacoin-app${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}
    >
      <header className="cacoin-header">
        <div
          className={`cacoin-header-brand${logo ? ' has-logo' : ''}`}
          aria-label="Cacoin"
        >
          {logo ? <img src={logo} alt="Logotipo da instituição" /> : 'c'}
        </div>
        <nav className="cacoin-breadcrumbs" aria-label="Caminho da página">
          {['Cacoin', ...breadcrumbTrail].map((label, index, trail) => (
            <Fragment key={`${label}-${index}`}>
              {index > 0 && <ChevronRight size={16} aria-hidden="true" />}
              {index === trail.length - 1 ? (
                <strong aria-current="page">{label}</strong>
              ) : (
                <span>{label}</span>
              )}
            </Fragment>
          ))}
        </nav>
        {institutionName && (
          <div className="cacoin-header-institution" title={institutionName}>
            <Radio size={16} className="cacoin-header-institution-icon" aria-hidden="true" />
            <span className="cacoin-header-institution-name">{institutionName}</span>
            <span className="cacoin-header-institution-separator" aria-hidden="true">|</span>
          </div>
        )}
        <div
          className="cacoin-header-date-time"
          aria-label={`${weekday}, ${currentDate}, ${currentTime}`}
        >
          {(
            <>
              <Tooltip title="Notificações">
                <IconButton
                  size="small"
                  aria-label={teacherUnread > 0 ? `Notificações (${teacherUnread} novas)` : 'Notificações'}
                  onClick={() => setBellOpen(true)}
                >
                  <Badge color="error" badgeContent={teacherUnread > 9 ? '9+' : teacherUnread}>
                    <Bell size={18} aria-hidden="true" />
                  </Badge>
                </IconButton>
              </Tooltip>
              <span aria-hidden="true">|</span>
            </>
          )}
          <span>{weekday}</span>
          <span aria-hidden="true">|</span>
          <span>{currentDate}</span>
          <span aria-hidden="true">|</span>
          <span>{currentTime}</span>
        </div>
        {getAuthToken() && (
          <Tooltip title="Terminar sessão">
            <IconButton
              aria-label="Terminar sessão"
              onClick={() => {
                setAuthToken(null);
                window.location.reload();
              }}
              sx={{ ml: 1.5 }}
            >
              <LogOut size={18} />
            </IconButton>
          </Tooltip>
        )}
      </header>
      <aside className="cacoin-sidebar" aria-label="Áreas principais">
        <nav className="cacoin-navigation" aria-label="Áreas">
          {(teacher ? portalSections() : hr ? hrSections : sections).map(({ id, label, icon: Icon }) => (
            <Tooltip key={id} title={label} placement="right">
              <IconButton
                aria-label={label}
                aria-pressed={activeArea.id === id}
                className={`cacoin-nav-button${activeArea.id === id ? ' active' : ''}`}
                onClick={() => {
                  if (id === 'folders') {
                    // menu completo: abre as Pastas num novo separador
                    window.open(`${window.location.origin}${window.location.pathname}?folders`, '_blank');
                    return;
                  }
                  onSectionChange(
                    teacher
                      ? teacherFirstSection(id)
                      : id === 'profile'
                        ? 'teacher-info'
                        : id === 'students'
                      ? studentLinks[0].id
                      : id === 'online-classes'
                        ? 'online-classes-dashboard'
                        : id === 'staff'
                          ? staffLinks[0].links[0].id
                          : id === 'finance'
                            ? 'finance-dashboard'
                            : id === 'expenses'
                              ? 'expenses-dashboard'
                              : id === 'search'
                                ? 'search-student'
                              : id === 'notifications'
                                ? 'notifications-dashboard'
                                : id === 'mobile-money'
                                  ? 'mobile-money-pay'
                                : id === 'users'
                                  ? 'users-dashboard'
                            : id === 'tasks'
                            ? 'tasks-dashboard'
                            : id,
                  );
                }}
              >
                <Icon size={21} aria-hidden="true" />
              </IconButton>
            </Tooltip>
          ))}
        </nav>
      </aside>
      <aside
        className="cacoin-link-sidebar"
        aria-label={`Ligações de ${activeArea.label}`}
        aria-expanded={!sidebarCollapsed}
      >
        {!sidebarCollapsed && (
          <>
            <div className="cacoin-sidebar-heading">
              <p>Área</p>
              <h2>{activeArea.label}</h2>
            </div>
            <nav className="cacoin-sidebar-links" aria-label={activeArea.label}>
              {isOnlineClassesSection && platformLoadError && (
                <p className="cacoin-sidebar-error" role="alert">
                  {platformLoadError}
                </p>
              )}
              {isOnlineClassesSection &&
                !platformLoadError &&
                configuredPlatforms.length === 0 && (
                  <p className="cacoin-sidebar-error" role="status">
                    Não existem plataformas configuradas.
                  </p>
                )}
              {isFolderSection ? (
                <button
                  type="button"
                  className="cacoin-sidebar-link active"
                  aria-current="page"
                  onClick={() => onSectionChange('folders')}
                >
                  <ActiveAreaIcon size={17} aria-hidden="true" />
                  <span>{activeArea.label}</span>
                </button>
              ) : (
                menuGroups.map(({ id, label, icon: Icon, links }) => (
                  <div key={id}>
                    <button
                      type="button"
                      className="cacoin-sidebar-link cacoin-sidebar-group"
                      aria-expanded={expandedGroups.has(id)}
                      onClick={() => toggleMainGroup(id)}
                    >
                      <Icon size={17} aria-hidden="true" />
                      <span>{label}</span>
                      <ChevronDown
                        className={expandedGroups.has(id) ? '' : 'collapsed'}
                        size={16}
                        aria-hidden="true"
                      />
                    </button>
                    {expandedGroups.has(id) && (
                      <div className="cacoin-sidebar-submenu">
                        {renderLinkTree(links)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </nav>
          </>
        )}
        <Tooltip
          title={sidebarCollapsed ? 'Expandir ligações' : 'Recolher ligações'}
          placement="right"
        >
          <IconButton
            className="cacoin-sidebar-toggle"
            aria-label={
              sidebarCollapsed ? 'Expandir ligações' : 'Recolher ligações'
            }
            aria-expanded={!sidebarCollapsed}
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            size="small"
          >
            {sidebarCollapsed ? (
              <ChevronRight size={19} />
            ) : (
              <ChevronLeft size={19} />
            )}
          </IconButton>
        </Tooltip>
      </aside>
      <main
        className={`cacoin-main${
          activeSection.startsWith('online-platform-')
            ? ' cacoin-main-platform'
            : ''
        }`}
      >
        {children}
        <TeacherNotificationDialog
          open={bellOpen}
          onClose={() => setBellOpen(false)}
          load={notificationLoader(teacher)}
        />
      </main>
    </div>
  );
}
