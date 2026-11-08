import { isHrProfileSection } from './components/teacherNav';
import { getPortalKind, setPersonalScope, setTeacherMode } from './utils/teacherMode';
import { lazy, Suspense, useEffect, useState } from 'react';
import Layout from './components/Layout';
import CoursesManagement from './pages/courses/courses/CoursesManagement';
import CategoriesManagement from './pages/courses/categories/CategoriesManagement';
import EnrollmentFeesManagement from './pages/courses/enrollmentfees/EnrollmentFeesManagement';
import LevelsManagement from './pages/courses/levels/LevelsManagement';
import ManualFeesManagement from './pages/courses/manualfees/ManualFeesManagement';
import ModalitiesManagement from './pages/courses/modalities/ModalitiesManagement';
import MonthlyFeesManagement from './pages/courses/monthlyfees/MonthlyFeesManagement';
import DisciplinesManagement from './pages/modules/disciplines/DisciplinesManagement';
import SettingsManagement from './pages/settings/SettingsManagement';
import PaymentMethodsManagement from './pages/settings/payments/PaymentMethodsManagement';
import PaymentPeriodManagement from './pages/settings/payments/PaymentPeriodManagement';
import SchoolManagement from './pages/settings/myschool/SchoolManagement';
import SchoolCustomization from './pages/settings/myschool/SchoolCustomization';
import SchoolReportManagement from './pages/settings/myschool/SchoolReportManagement';
import TasksManagement from './pages/tasks/TasksManagement';
import TaskDashboard from './pages/tasks/TaskDashboard';
import ForwardedTasksPage from './pages/staffportal/ForwardedTasksPage';
import StaffShell from './pages/staffportal/StaffShell';
import TeacherCoursesPage from './pages/teacher/TeacherCoursesPage';
import TeacherDocumentsPage from './pages/teacher/TeacherDocumentsPage';
import TeacherNotificationsPage from './pages/teacher/TeacherNotificationsPage';
import TeacherProfilePage from './pages/teacher/TeacherProfilePage';
import TeacherStudentsPage from './pages/teacher/TeacherStudentsPage';
import './styles.css';

const availableThemes = ['blue', 'green', 'purple', 'dark'];
const themeStorageKey = 'cacoin.theme';
const logoStorageKey = 'cacoin.logo';

const StudentLookUpSearch = lazy(
  () => import('./pages/lookup/StudentLookUpSearch'),
);
const ModulesManagement = lazy(
  () => import('./pages/modules/modules/ModulesManagement'),
);
const StudentEnrollmentPage = lazy(
  () => import('./pages/students/StudentEnrollmentPage'),
);
const StudentManagementPage = lazy(
  () => import('./pages/students/StudentManagementPage'),
);
const StudentFeesManagement = lazy(
  () => import('./pages/students/StudentFeesManagement'),
);
const StudentEnrollmentPayments = lazy(
  () => import('./pages/students/StudentEnrollmentPayments'),
);
const StudentTestCreatePage = lazy(
  () => import('./pages/students/tests/StudentTestCreatePage'),
);
const StudentTestManagementPage = lazy(
  () => import('./pages/students/tests/StudentTestManagementPage'),
);
const StudentExamCreatePage = lazy(
  () => import('./pages/students/exams/StudentExamCreatePage'),
);
const StudentExamManagementPage = lazy(
  () => import('./pages/students/exams/StudentExamManagementPage'),
);
const TestDashboardPage = lazy(() => import('./pages/tests/TestDashboardPage'));
const TestRegistrationPage = lazy(
  () => import('./pages/tests/TestRegistrationPage'),
);
const TestSettingsManagement = lazy(
  () => import('./pages/settings/tests/TestSettingsManagement'),
);
const ExamDashboardPage = lazy(() => import('./pages/exams/ExamDashboardPage'));
const ExamRegistrationPage = lazy(
  () => import('./pages/exams/ExamRegistrationPage'),
);
const ExamSettingsManagement = lazy(
  () => import('./pages/settings/exams/ExamSettingsManagement'),
);
const UniformDashboardPage = lazy(
  () => import('./pages/uniforms/UniformDashboardPage'),
);
const UniformOrderPage = lazy(
  () => import('./pages/uniforms/UniformOrderPage'),
);
const UniformSettingsManagement = lazy(
  () => import('./pages/settings/uniforms/UniformSettingsManagement'),
);
const GraduationDashboardPage = lazy(
  () => import('./pages/graduations/GraduationDashboardPage'),
);
const GraduationRegistrationPage = lazy(
  () => import('./pages/graduations/GraduationRegistrationPage'),
);
const GraduationParticipantsPage = lazy(
  () => import('./pages/graduations/GraduationParticipantsPage'),
);
const GraduationGraduatesPage = lazy(
  () => import('./pages/graduations/GraduationGraduatesPage'),
);
const GraduationSettingsManagement = lazy(
  () => import('./pages/settings/graduations/GraduationSettingsManagement'),
);
const SuspensionDashboardPage = lazy(
  () => import('./pages/suspensions/SuspensionDashboardPage'),
);
const SuspensionRegistrationPage = lazy(
  () => import('./pages/suspensions/SuspensionRegistrationPage'),
);
const SuspensionSettingsManagement = lazy(
  () => import('./pages/settings/suspensions/SuspensionSettingsManagement'),
);
const AttendanceDashboardPage = lazy(
  () => import('./pages/attendances/AttendanceDashboardPage'),
);
const AttendanceRegisterPage = lazy(
  () => import('./pages/attendances/AttendanceRegisterPage'),
);
const AttendanceTablesPage = lazy(
  () => import('./pages/attendances/AttendanceTablesPage'),
);
const AssessmentNewRecordPage = lazy(
  () => import('./pages/assessments/AssessmentNewRecordPage'),
);
const AssessmentPendingPage = lazy(
  () => import('./pages/assessments/AssessmentPendingPage'),
);
const AssessmentGradesPage = lazy(
  () => import('./pages/assessments/AssessmentGradesPage'),
);
const PautaDashboardPage = lazy(
  () => import('./pages/pautas/PautaDashboardPage'),
);
const PautaNewPage = lazy(() => import('./pages/pautas/PautaNewPage'));
const PautaListPage = lazy(() => import('./pages/pautas/PautaListPage'));
const PautaSettingsManagement = lazy(
  () => import('./pages/settings/pautas/PautaSettingsManagement'),
);
const StaffDocumentTypesPage = lazy(
  () => import('./pages/staff/documents/StaffDocumentTypesPage'),
);
const StaffExpirationPage = lazy(
  () => import('./pages/staff/documents/StaffExpirationPage'),
);
const FinanceDashboardPage = lazy(
  () => import('./pages/finance/FinanceDashboardPage'),
);
const SalaryRegistrationPage = lazy(
  () => import('./pages/finance/SalaryRegistrationPage'),
);
const SalaryPaymentsPage = lazy(
  () => import('./pages/finance/SalaryPaymentsPage'),
);
const SalaryPendingPage = lazy(
  () => import('./pages/finance/SalaryPendingPage'),
);
const SalaryDebtsPage = lazy(() => import('./pages/finance/SalaryDebtsPage'));
const SalaryReportsPage = lazy(
  () => import('./pages/finance/SalaryReportsPage'),
);
const FinanceSettingsManagement = lazy(
  () => import('./pages/settings/finance/FinanceSettingsManagement'),
);
const PositionSettingsManagement = lazy(
  () => import('./pages/settings/finance/PositionSettingsManagement'),
);
const OnlineClassesPage = lazy(
  () => import('./pages/onlineclasses/OnlineClassesPage'),
);
const OnlineClassesDashboardPage = lazy(
  () => import('./pages/onlineclasses/OnlineClassesDashboardPage'),
);
const OnlineClassPlatformPage = lazy(
  () => import('./pages/onlineclasses/OnlineClassPlatformPage'),
);
const OnlineClassesRegistrationPage = lazy(
  () => import('./pages/onlineclasses/OnlineClassesRegistrationPage'),
);
const OnlineClassesSettingsManagement = lazy(
  () => import('./pages/settings/onlineclasses/OnlineClassesSettingsManagement'),
);
const OnlineAttendanceSettingsManagement = lazy(
  () => import('./pages/settings/onlineclasses/OnlineAttendanceSettingsManagement'),
);
const LeaveDashboardPage = lazy(() => import('./pages/leaves/LeaveDashboardPage'));
const LeaveRequestPage = lazy(() => import('./pages/leaves/LeaveRequestPage'));
const PartitionSettingsManagement = lazy(
  () => import('./pages/settings/partitions/PartitionSettingsManagement'),
);
const FineSettingsManagement = lazy(
  () => import('./pages/settings/fines/FineSettingsManagement'),
);
const LeaveSettingsManagement = lazy(
  () => import('./pages/settings/leaves/LeaveSettingsManagement'),
);
const MobileMoneySettingsManagement = lazy(
  () => import('./pages/settings/mobilemoney/MobileMoneySettingsManagement'),
);
const MobileMoneyPayPage = lazy(() => import('./pages/mobilemoney/MobileMoneyPayPage'));
const MobileMoneyTransactionsPage = lazy(
  () => import('./pages/mobilemoney/MobileMoneyTransactionsPage'),
);
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const UserAccountsPage = lazy(() => import('./pages/users/UserAccountsPage'));
const UserDashboardPage = lazy(() => import('./pages/users/UserDashboardPage'));
const UserLogsManagement = lazy(
  () => import('./pages/settings/users/UserLogsManagement'),
);
const UserSettingsManagement = lazy(
  () => import('./pages/settings/users/UserSettingsManagement'),
);
const StudentRequestDashboardPage = lazy(
  () => import('./pages/requests/StudentRequestDashboardPage'),
);
const StudentRequestPage = lazy(() => import('./pages/requests/StudentRequestPage'));
const RequestSettingsManagement = lazy(
  () => import('./pages/settings/requests/RequestSettingsManagement'),
);
const ExpensesDashboardPage = lazy(
  () => import('./pages/expenses/ExpensesDashboardPage'),
);
const ExpenseRecordsPage = lazy(() => import('./pages/expenses/ExpenseRecordsPage'));
const ReturnRequestPage = lazy(() => import('./pages/expenses/ReturnRequestPage'));
const ExpenseSettingsManagement = lazy(
  () => import('./pages/settings/expenses/ExpenseSettingsManagement'),
);
const NotificationDashboardPage = lazy(
  () => import('./pages/notifications/NotificationDashboardPage'),
);
const NotificationMessagesPage = lazy(
  () => import('./pages/notifications/NotificationMessagesPage'),
);
const NotificationSettingsManagement = lazy(
  () => import('./pages/settings/notifications/NotificationSettingsManagement'),
);
const StaffAttendanceDashboardPage = lazy(
  () => import('./pages/staffattendances/StaffAttendanceDashboardPage'),
);
const StaffAttendanceRegisterPage = lazy(
  () => import('./pages/staffattendances/StaffAttendanceRegisterPage'),
);
const StaffAttendanceTablesPage = lazy(
  () => import('./pages/staffattendances/StaffAttendanceTablesPage'),
);
const staffEnrollmentPages = {
  hr: lazy(() => import('./pages/staff/hr/HrEnrollmentPage')),
  teachers: lazy(() => import('./pages/staff/teachers/TeacherEnrollmentPage')),
  other: lazy(() => import('./pages/staff/other/OtherEnrollmentPage')),
};
const staffManagementPages = {
  hr: lazy(() => import('./pages/staff/hr/HrManagementPage')),
  teachers: lazy(() => import('./pages/staff/teachers/TeacherManagementPage')),
  other: lazy(() => import('./pages/staff/other/OtherManagementPage')),
};

const studentSectionLabels = {
  'student-enroll': 'Inscrever',
  'student-manage': 'Gerir',
  'student-history': 'Histórico',
  'student-enrollment-pending': 'Inscrição: Pendente',
  'student-enrollment-paid': 'Inscrição: Pago',
  'student-monthly-pending': 'Mensalidades: Pendente',
  'student-monthly-overdue': 'Mensalidades: Em Atraso',
  'student-monthly-paid': 'Mensalidades: Pago',
};
const studentFeeViews = {
  'student-monthly-pending': { feeType: 'MONTHLY', status: 'PENDING' },
  'student-monthly-overdue': { feeType: 'MONTHLY', status: 'OVERDUE' },
  'student-monthly-paid': { feeType: 'MONTHLY', status: 'PAID' },
};

const staffTypes = {
  hr: 'Recursos Humanos',
  teachers: 'Professores',
  other: 'Outros Funcionários',
};

const staffSection = (section) => {
  const [, type, action] = section.split('-');
  return staffTypes[type] && ['enroll', 'manage', 'history'].includes(action)
    ? { type, action }
    : null;
};
const testRegistrationSection = (section) => {
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

const examRegistrationSection = (section) => {
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

const uniformOrderSection = (section) => {
  const match = section.match(/^student-uniforms-(request|list)$/);
  return match ? { mode: match[1] } : null;
};

const graduationRegistrationSection = (section) => {
  const match = section.match(/^student-graduations-(enroll|enrolled)$/);
  return match ? { mode: match[1] === 'enroll' ? 'enroll' : 'list' } : null;
};

const suspensionSection = (section) => {
  const match = section.match(/^student-suspensions-(register|list)$/);
  return match ? { mode: match[1] } : null;
};

const attendanceTableSection = (section) => {
  const match = section.match(
    /^student-attendances-(list|absences|justified|excesses)$/,
  );
  return match ? { mode: match[1] } : null;
};

const financePaymentModes = {
  'finance-processing-process': 'process',
  'finance-processing-list': 'processed',
  'finance-advance-advance': 'advance',
  'finance-advance-list': 'advanced',
  'finance-debts-settle': 'settle',
};

const financeRegistrationSection = (section) => {
  const match = section.match(/^finance-registration-(register|list)$/);
  return match ? { mode: match[1] } : null;
};

const staffAttendanceSection = (section) => {
  const match = section.match(
    /^staff-(hr|teachers|other)-attendances-(dashboard|register|list|absences|justified|excesses)$/,
  );
  if (match) return { type: match[1], page: match[2] };
  const own = section.match(/^profile-attendances-(dashboard|list|absences|justified|excesses)$/);
  return own ? { type: 'hr', page: own[1] } : null;
};

const expenseRecordSections = {
  'expenses-new': { kind: 'expenses', mode: 'new' },
  'expenses-list': { kind: 'expenses', mode: 'list' },
  'expenses-purchases-new': { kind: 'purchases', mode: 'new' },
  'expenses-purchases-list': { kind: 'purchases', mode: 'list' },
  'expenses-returns-pending': { kind: 'returns', mode: 'list', view: 'pending' },
  'expenses-returns-list': { kind: 'returns', mode: 'list', view: 'done' },
  'expenses-sales-new': { kind: 'sales', mode: 'new' },
  'expenses-sales-list': { kind: 'sales', mode: 'list' },
};

const schoolSectionLabels = {
  'school-info': 'Escola',
  'school-customization': 'Customização',
  'school-report-header': 'Relatórios: Cabeçalho',
  'school-report-footer': 'Relatórios: Rodapé',
};

export default function App({ teacher = false, hr = false }) {
  const [activeSection, setActiveSection] = useState(teacher || hr ? 'teacher-info' : 'dashboard');
  // RH: as páginas de «Meu Perfil» são pessoais; todas as outras são o sistema geral.
  const personalPage = hr && isHrProfileSection(activeSection);
  if (hr) {
    setTeacherMode(personalPage);
    setPersonalScope(personalPage);
  }
  const [studentNotice, setStudentNotice] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);
  const [testNotice, setTestNotice] = useState('');
  const [editingTest, setEditingTest] = useState(null);
  const [examNotice, setExamNotice] = useState('');
  const [editingExam, setEditingExam] = useState(null);
  const [staffNotice, setStaffNotice] = useState('');
  const [editingStaff, setEditingStaff] = useState(null);
  const [editingOnlineLesson, setEditingOnlineLesson] = useState(null);
  const [theme, setTheme] = useState(() => {
    const savedTheme = window.localStorage.getItem(themeStorageKey);
    return availableThemes.includes(savedTheme) ? savedTheme : 'blue';
  });
  const [logo, setLogo] = useState(
    () => window.localStorage.getItem(logoStorageKey) || '',
  );
  const currentStaffSection = staffSection(activeSection);
  const currentTestRegistrationSection = testRegistrationSection(activeSection);
  const currentExamRegistrationSection = examRegistrationSection(activeSection);
  const currentUniformOrderSection = uniformOrderSection(activeSection);
  const currentGraduationRegistrationSection =
    graduationRegistrationSection(activeSection);
  const currentSuspensionSection = suspensionSection(activeSection);
  const currentFinanceRegistrationSection =
    financeRegistrationSection(activeSection);
  const currentFinancePaymentMode = financePaymentModes[activeSection];
  const currentAttendanceTableSection = attendanceTableSection(activeSection);
  const currentExpenseRecordSection = expenseRecordSections[activeSection];
  const currentStaffAttendanceSection = staffAttendanceSection(activeSection);
  const CurrentStaffEnrollmentPage = currentStaffSection
    ? staffEnrollmentPages[currentStaffSection.type]
    : null;
  const CurrentStaffManagementPage = currentStaffSection
    ? staffManagementPages[currentStaffSection.type]
    : null;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const changeSection = (section) => {
    setEditingOnlineLesson(null);
    setEditingTest(null);
    setTestNotice('');
    setEditingExam(null);
    setExamNotice('');
    setActiveSection(section);
  };

  const saveTheme = (newTheme) => {
    if (!availableThemes.includes(newTheme)) {
      throw new Error('O tema selecionado não é válido.');
    }
    window.localStorage.setItem(themeStorageKey, newTheme);
    setTheme(newTheme);
  };

  const saveLogo = (newLogo) => {
    if (newLogo) {
      window.localStorage.setItem(logoStorageKey, newLogo);
    } else {
      window.localStorage.removeItem(logoStorageKey);
    }
    setLogo(newLogo);
  };

  const teacherPages = {
    'teacher-info': <TeacherProfilePage theme={theme} onThemeChange={saveTheme} />,
    'teacher-courses': <TeacherCoursesPage />,
    'teacher-students': <TeacherStudentsPage />,
    'teacher-documents': <TeacherDocumentsPage />,
    'teacher-notifications': <TeacherNotificationsPage />,
    'staff-forwarded-todo': <ForwardedTasksPage />,
    'staff-forwarded-done': <ForwardedTasksPage done />,
  };

  // O portal dos funcionários «outros» usa a estrutura do portal do estudante.
  const Shell = teacher && getPortalKind() === 'other' ? StaffShell : Layout;

  return (
    <Shell
      activeSection={activeSection}
      onSectionChange={changeSection}
      logo={logo}
      teacher={teacher}
      hr={hr}
    >
      {(teacher || hr) && teacherPages[activeSection] ? teacherPages[activeSection] : activeSection === 'settings' ||
      activeSection === 'settings-form' ||
      activeSection === 'staff-form' ? (
        <SettingsManagement
          formMode={
            activeSection === 'settings-form' || activeSection === 'staff-form'
          }
          formType={activeSection === 'staff-form' ? 'staff' : 'student'}
        />
      ) : activeSection === 'payment-methods' ? (
        <PaymentMethodsManagement />
      ) : activeSection === 'payment-period' ? (
        <PaymentPeriodManagement />
      ) : activeSection.startsWith('settings-tests-') ? (
        <Suspense fallback={<p>A carregar as definições de testes…</p>}>
          <TestSettingsManagement
            mode={activeSection.slice('settings-tests-'.length)}
          />
        </Suspense>
      ) : activeSection.startsWith('settings-exams-') ? (
        <Suspense fallback={<p>A carregar as definições de exames…</p>}>
          <ExamSettingsManagement
            mode={activeSection.slice('settings-exams-'.length)}
          />
        </Suspense>
      ) : activeSection.startsWith('settings-uniforms-') ? (
        <Suspense fallback={<p>A carregar as definições de uniforme…</p>}>
          <UniformSettingsManagement
            mode={activeSection.slice('settings-uniforms-'.length)}
          />
        </Suspense>
      ) : activeSection.startsWith('settings-graduations-') ? (
        <Suspense fallback={<p>A carregar as definições de graduação…</p>}>
          <GraduationSettingsManagement
            mode={activeSection.slice('settings-graduations-'.length)}
          />
        </Suspense>
      ) : activeSection.startsWith('settings-suspensions-') ? (
        <Suspense fallback={<p>A carregar as definições de trancamento…</p>}>
          <SuspensionSettingsManagement
            mode={activeSection.slice('settings-suspensions-'.length)}
          />
        </Suspense>
      ) : activeSection.startsWith('settings-pautas-') ? (
        <Suspense fallback={<p>A carregar as definições de pautas…</p>}>
          <PautaSettingsManagement
            mode={activeSection.slice('settings-pautas-'.length)}
          />
        </Suspense>
      ) : activeSection.startsWith('settings-finance-') ? (
        <Suspense fallback={<p>A carregar as definições de finanças…</p>}>
          <FinanceSettingsManagement
            mode={activeSection.slice('settings-finance-'.length)}
          />
        </Suspense>
      ) : activeSection === 'settings-positions-list' ? (
        <Suspense fallback={<p>A carregar os cargos…</p>}>
          <PositionSettingsManagement />
        </Suspense>
      ) : activeSection.startsWith('settings-online-classes-') ? (
        <Suspense fallback={<p>A carregar as definições das aulas online…</p>}>
          <OnlineClassesSettingsManagement
            mode={activeSection.slice('settings-online-classes-'.length)}
          />
        </Suspense>
      ) : activeSection.startsWith('settings-online-attendance-') ? (
        <Suspense fallback={<p>A carregar as definições das presenças…</p>}>
          <OnlineAttendanceSettingsManagement
            mode={activeSection.slice('settings-online-attendance-'.length)}
          />
        </Suspense>
      ) : activeSection.startsWith('settings-partitions-') ? (
        <Suspense fallback={<p>A carregar a repartição…</p>}>
          <PartitionSettingsManagement />
        </Suspense>
      ) : activeSection.startsWith('settings-fines-') ? (
        <Suspense fallback={<p>A carregar as definições das multas…</p>}>
          <FineSettingsManagement />
        </Suspense>
      ) : activeSection.startsWith('settings-leaves-') ? (
        <Suspense fallback={<p>A carregar as definições dos pedidos de saída…</p>}>
          <LeaveSettingsManagement
            mode={activeSection.slice('settings-leaves-'.length)}
          />
        </Suspense>
      ) : activeSection.startsWith('settings-mobile-money-') ? (
        <Suspense fallback={<p>A carregar as definições do Mobile Money…</p>}>
          <MobileMoneySettingsManagement
            mode={activeSection.slice('settings-mobile-money-'.length)}
          />
        </Suspense>
      ) : activeSection === 'mobile-money-pay' ? (
        <Suspense fallback={<p>A carregar o Mobile Money…</p>}>
          <MobileMoneyPayPage />
        </Suspense>
      ) : activeSection.startsWith('mobile-money-') ? (
        <Suspense fallback={<p>A carregar o Mobile Money…</p>}>
          <MobileMoneyTransactionsPage
            key={activeSection}
            mode={activeSection.slice('mobile-money-'.length)}
          />
        </Suspense>
      ) : activeSection === 'dashboard' ? (
        <Suspense fallback={<p>A carregar o Dashboard…</p>}>
          <DashboardPage />
        </Suspense>
      ) : activeSection === 'settings-users-logs' ? (
        <Suspense fallback={<p>A carregar os logs…</p>}>
          <UserLogsManagement />
        </Suspense>
      ) : activeSection.startsWith('settings-users-') ? (
        <Suspense fallback={<p>A carregar as definições dos usuários…</p>}>
          <UserSettingsManagement
            mode={activeSection.slice('settings-users-'.length)}
          />
        </Suspense>
      ) : activeSection === 'users-dashboard' ? (
        <Suspense fallback={<p>A carregar o Dashboard dos usuários…</p>}>
          <UserDashboardPage />
        </Suspense>
      ) : activeSection.startsWith('users-students-') ? (
        <Suspense fallback={<p>A carregar os usuários…</p>}>
          {activeSection === 'users-students-dashboard' ? (
            <UserDashboardPage scope="students" />
          ) : (
            <UserAccountsPage
              key={activeSection}
              kind="STUDENT"
              status={activeSection.slice('users-students-'.length)}
            />
          )}
        </Suspense>
      ) : activeSection.startsWith('users-staff-') ? (
        <Suspense fallback={<p>A carregar os usuários…</p>}>
          {activeSection === 'users-staff-dashboard' ? (
            <UserDashboardPage scope="staff" />
          ) : (
            <UserAccountsPage
              key={activeSection}
              kind="STAFF"
              status={activeSection.slice('users-staff-'.length)}
            />
          )}
        </Suspense>
      ) : activeSection.startsWith('settings-requests-') ? (
        <Suspense fallback={<p>A carregar as definições dos pedidos…</p>}>
          <RequestSettingsManagement
            mode={activeSection.slice('settings-requests-'.length)}
          />
        </Suspense>
      ) : activeSection === 'student-requests-dashboard' ? (
        <Suspense fallback={<p>A carregar o Dashboard dos pedidos…</p>}>
          <StudentRequestDashboardPage />
        </Suspense>
      ) : activeSection.startsWith('student-requests-') ? (
        <Suspense fallback={<p>A carregar os pedidos…</p>}>
          <StudentRequestPage
            key={activeSection}
            mode={activeSection.slice('student-requests-'.length)}
          />
        </Suspense>
      ) : activeSection.startsWith('settings-expenses-') ? (
        <Suspense fallback={<p>A carregar as definições das despesas…</p>}>
          <ExpenseSettingsManagement
            mode={activeSection.slice('settings-expenses-'.length)}
          />
        </Suspense>
      ) : activeSection.startsWith('settings-notifications-') ? (
        <Suspense fallback={<p>A carregar as definições das notificações…</p>}>
          <NotificationSettingsManagement
            mode={activeSection.slice('settings-notifications-'.length)}
          />
        </Suspense>
      ) : currentStaffAttendanceSection ? (
        <Suspense fallback={<p>A carregar as presenças dos funcionários…</p>}>
          {currentStaffAttendanceSection.page === 'dashboard' ? (
            <StaffAttendanceDashboardPage
              key={currentStaffAttendanceSection.type}
              type={currentStaffAttendanceSection.type}
            />
          ) : currentStaffAttendanceSection.page === 'register' ? (
            <StaffAttendanceRegisterPage
              key={currentStaffAttendanceSection.type}
              type={currentStaffAttendanceSection.type}
            />
          ) : (
            <StaffAttendanceTablesPage
              key={activeSection}
              type={currentStaffAttendanceSection.type}
              mode={currentStaffAttendanceSection.page}
              readOnly={teacher || personalPage}
            />
          )}
        </Suspense>
      ) : activeSection === 'staff-leaves-dashboard' || activeSection === 'profile-leaves-dashboard' ? (
        <Suspense fallback={<p>A carregar o Dashboard dos pedidos de saída…</p>}>
          <LeaveDashboardPage />
        </Suspense>
      ) : activeSection === 'staff-leaves-request' ||
        activeSection === 'staff-leaves-list' ||
        activeSection === 'profile-leaves-request' ||
        activeSection === 'profile-leaves-list' ? (
        <Suspense fallback={<p>A carregar os pedidos de saída…</p>}>
          <LeaveRequestPage
            key={activeSection}
            mode={activeSection.endsWith('-leaves-request') ? 'request' : 'list'}
            teacher={teacher || personalPage}
          />
        </Suspense>
      ) : activeSection === 'expenses-dashboard' ? (
        <Suspense fallback={<p>A carregar o Dashboard das despesas…</p>}>
          <ExpensesDashboardPage />
        </Suspense>
      ) : activeSection === 'expenses-returns-new' ? (
        <Suspense fallback={<p>A carregar a devolução…</p>}>
          <ReturnRequestPage />
        </Suspense>
      ) : currentExpenseRecordSection ? (
        <Suspense fallback={<p>A carregar as despesas…</p>}>
          <ExpenseRecordsPage
            key={activeSection}
            {...currentExpenseRecordSection}
          />
        </Suspense>
      ) : activeSection === 'notifications-dashboard' ? (
        <Suspense fallback={<p>A carregar o Dashboard das notificações…</p>}>
          <NotificationDashboardPage />
        </Suspense>
      ) : activeSection === 'notifications-whatsapp' ||
        activeSection === 'notifications-sms' ? (
        <Suspense fallback={<p>A carregar as mensagens…</p>}>
          <NotificationMessagesPage
            key={activeSection}
            channelKey={activeSection.slice('notifications-'.length)}
          />
        </Suspense>
      ) : activeSection === 'school-info' ? (
        <SchoolManagement />
      ) : activeSection === 'school-customization' ? (
        <SchoolCustomization
          theme={theme}
          onThemeChange={saveTheme}
          logo={logo}
          onLogoChange={saveLogo}
        />
      ) : activeSection === 'school-report-header' ||
        activeSection === 'school-report-footer' ? (
        <SchoolReportManagement
          mode={activeSection === 'school-report-header' ? 'header' : 'footer'}
          logo={logo}
        />
      ) : activeSection === 'tasks-dashboard' ? (
        <TaskDashboard onNavigate={setActiveSection} />
      ) : activeSection === 'tasks' || activeSection.startsWith('tasks-') ? (
        <TasksManagement
          view={
            activeSection === 'tasks'
              ? 'all'
              : activeSection.slice('tasks-'.length)
          }
        />
      ) : schoolSectionLabels[activeSection] ? (
        <section className="cacoin-course-page">
          <header className="cacoin-page-heading">
            <div>
              <p className="cacoin-eyebrow">Minha Escola</p>
              <h1>{schoolSectionLabels[activeSection]}</h1>
            </div>
          </header>
          <p>Esta área será implementada na próxima etapa.</p>
        </section>
      ) : activeSection === 'search-student' ? (
        <Suspense fallback={<p>A carregar a pesquisa…</p>}>
          <StudentLookUpSearch />
        </Suspense>
      ) : activeSection === 'student-enroll' ? (
        <Suspense fallback={<p>A carregar formulário de inscrição…</p>}>
          <StudentEnrollmentPage
            student={editingStudent}
            onCancel={() => {
              const returnSection =
                editingStudent?.active === false
                  ? 'student-history'
                  : 'student-manage';
              setEditingStudent(null);
              setActiveSection(returnSection);
            }}
            onEnrolled={(studentCode) => {
              setEditingStudent(null);
              setStudentNotice(
                `Estudante inscrito com sucesso. Código: ${studentCode}.`,
              );
              setActiveSection('student-enrollment-pending');
            }}
            onUpdated={(studentCode) => {
              const returnSection =
                editingStudent?.active === false
                  ? 'student-history'
                  : 'student-manage';
              setEditingStudent(null);
              setStudentNotice(
                `Estudante ${studentCode} atualizado com sucesso.`,
              );
              setActiveSection(returnSection);
            }}
          />
        </Suspense>
      ) : activeSection === 'student-manage' ||
        activeSection === 'student-history' ? (
        <Suspense fallback={<p>A carregar estudantes…</p>}>
          <StudentManagementPage
            historyMode={activeSection === 'student-history'}
            successMessage={studentNotice}
            onStatusChanged={(student, active) => {
              setStudentNotice(
                active
                  ? `${student.studentCode} foi ativado e voltou para Gerir.`
                  : `${student.studentCode} foi desativado e movido para Histórico.`,
              );
              setActiveSection(active ? 'student-manage' : 'student-history');
            }}
            onEdit={(student) => {
              setEditingStudent(student);
              setStudentNotice('');
              setActiveSection('student-enroll');
            }}
            onEnroll={() => {
              setEditingStudent(null);
              setStudentNotice('');
              setActiveSection('student-enroll');
            }}
          />
        </Suspense>
      ) : activeSection === 'student-enrollment-pending' ||
        activeSection === 'student-enrollment-paid' ? (
        <Suspense fallback={<p>A carregar pagamentos de inscrição…</p>}>
          <StudentEnrollmentPayments
            status={
              activeSection === 'student-enrollment-pending'
                ? 'PENDING'
                : 'PAID'
            }
            successMessage={studentNotice}
          />
        </Suspense>
      ) : studentFeeViews[activeSection] ? (
        <Suspense fallback={<p>A carregar cobranças dos estudantes…</p>}>
          <StudentFeesManagement
            {...studentFeeViews[activeSection]}
            successMessage={studentNotice}
          />
        </Suspense>
      ) : activeSection === 'student-tests-dashboard' ? (
        <Suspense fallback={<p>A carregar o Dashboard dos testes…</p>}>
          <TestDashboardPage />
        </Suspense>
      ) : currentTestRegistrationSection ? (
        <Suspense fallback={<p>A carregar inscrições dos testes…</p>}>
          <TestRegistrationPage
            key={`${currentTestRegistrationSection.testType}-${currentTestRegistrationSection.mode}`}
            {...currentTestRegistrationSection}
          />
        </Suspense>
      ) : activeSection === 'student-exams-dashboard' ? (
        <Suspense fallback={<p>A carregar o Dashboard dos exames…</p>}>
          <ExamDashboardPage />
        </Suspense>
      ) : currentExamRegistrationSection ? (
        <Suspense fallback={<p>A carregar inscrições dos exames…</p>}>
          <ExamRegistrationPage
            key={`${currentExamRegistrationSection.examType}-${currentExamRegistrationSection.mode}`}
            {...currentExamRegistrationSection}
          />
        </Suspense>
      ) : activeSection === 'student-uniforms-dashboard' ? (
        <Suspense fallback={<p>A carregar o Dashboard do uniforme…</p>}>
          <UniformDashboardPage />
        </Suspense>
      ) : currentUniformOrderSection ? (
        <Suspense fallback={<p>A carregar pedidos de uniforme…</p>}>
          <UniformOrderPage
            key={currentUniformOrderSection.mode}
            {...currentUniformOrderSection}
          />
        </Suspense>
      ) : activeSection === 'student-graduations-dashboard' ? (
        <Suspense fallback={<p>A carregar o Dashboard da graduação…</p>}>
          <GraduationDashboardPage />
        </Suspense>
      ) : currentGraduationRegistrationSection ? (
        <Suspense fallback={<p>A carregar inscrições na graduação…</p>}>
          <GraduationRegistrationPage
            key={currentGraduationRegistrationSection.mode}
            {...currentGraduationRegistrationSection}
          />
        </Suspense>
      ) : activeSection === 'student-graduations-ceremony' ? (
        <Suspense fallback={<p>A carregar a graduação…</p>}>
          <GraduationParticipantsPage />
        </Suspense>
      ) : activeSection === 'student-graduations-graduates' ? (
        <Suspense fallback={<p>A carregar os formados…</p>}>
          <GraduationGraduatesPage />
        </Suspense>
      ) : activeSection === 'student-suspensions-dashboard' ? (
        <Suspense fallback={<p>A carregar o Dashboard do trancamento…</p>}>
          <SuspensionDashboardPage />
        </Suspense>
      ) : currentSuspensionSection ? (
        <Suspense fallback={<p>A carregar trancamentos…</p>}>
          <SuspensionRegistrationPage
            key={currentSuspensionSection.mode}
            {...currentSuspensionSection}
          />
        </Suspense>
      ) : activeSection === 'student-attendances-dashboard' ? (
        <Suspense fallback={<p>A carregar o Dashboard das presenças…</p>}>
          <AttendanceDashboardPage />
        </Suspense>
      ) : activeSection === 'student-attendances-register' ? (
        <Suspense fallback={<p>A carregar o registo de presenças…</p>}>
          <AttendanceRegisterPage />
        </Suspense>
      ) : currentAttendanceTableSection ? (
        <Suspense fallback={<p>A carregar presenças…</p>}>
          <AttendanceTablesPage
            key={currentAttendanceTableSection.mode}
            {...currentAttendanceTableSection}
          />
        </Suspense>
      ) : activeSection === 'student-records-new' ? (
        <Suspense fallback={<p>A carregar o novo registo…</p>}>
          <AssessmentNewRecordPage />
        </Suspense>
      ) : activeSection === 'student-records-pending' ? (
        <Suspense fallback={<p>A carregar registos pendentes…</p>}>
          <AssessmentPendingPage />
        </Suspense>
      ) : activeSection === 'student-records-grades' ? (
        <Suspense fallback={<p>A carregar as notas…</p>}>
          <AssessmentGradesPage />
        </Suspense>
      ) : activeSection === 'student-records-history' ? (
        <Suspense fallback={<p>A carregar o histórico das notas…</p>}>
          <AssessmentGradesPage mode="history" />
        </Suspense>
      ) : activeSection === 'student-pautas-dashboard' ? (
        <Suspense fallback={<p>A carregar o Dashboard das pautas…</p>}>
          <PautaDashboardPage />
        </Suspense>
      ) : activeSection === 'student-pautas-new' ? (
        <Suspense fallback={<p>A carregar a nova pauta…</p>}>
          <PautaNewPage />
        </Suspense>
      ) : activeSection === 'student-pautas-list' ? (
        <Suspense fallback={<p>A carregar as pautas…</p>}>
          <PautaListPage />
        </Suspense>
      ) : activeSection === 'staff-documents-types' ? (
        <Suspense fallback={<p>A carregar os tipos de documento…</p>}>
          <StaffDocumentTypesPage />
        </Suspense>
      ) : activeSection === 'staff-documents-expiring' ? (
        <Suspense fallback={<p>A carregar os documentos a expirar…</p>}>
          <StaffExpirationPage mode="expiring" />
        </Suspense>
      ) : activeSection === 'staff-documents-expired' ? (
        <Suspense fallback={<p>A carregar os documentos expirados…</p>}>
          <StaffExpirationPage mode="expired" />
        </Suspense>
      ) : activeSection === 'finance-dashboard' ? (
        <Suspense fallback={<p>A carregar o Dashboard das finanças…</p>}>
          <FinanceDashboardPage />
        </Suspense>
      ) : currentFinanceRegistrationSection ? (
        <Suspense fallback={<p>A carregar o cadastro de salários…</p>}>
          <SalaryRegistrationPage
            key={currentFinanceRegistrationSection.mode}
            {...currentFinanceRegistrationSection}
          />
        </Suspense>
      ) : currentFinancePaymentMode ? (
        <Suspense fallback={<p>A carregar os pagamentos…</p>}>
          <SalaryPaymentsPage
            key={currentFinancePaymentMode}
            mode={currentFinancePaymentMode}
          />
        </Suspense>
      ) : activeSection === 'finance-pending' ? (
        <Suspense fallback={<p>A carregar salários pendentes…</p>}>
          <SalaryPendingPage />
        </Suspense>
      ) : activeSection === 'finance-debts-list' ? (
        <Suspense fallback={<p>A carregar dívidas…</p>}>
          <SalaryDebtsPage />
        </Suspense>
      ) : activeSection === 'finance-overview-reports' ? (
        <Suspense fallback={<p>A carregar relatórios…</p>}>
          <SalaryReportsPage />
        </Suspense>
      ) : activeSection === 'student-test-create' ? (
        <Suspense fallback={<p>A carregar formulário do teste…</p>}>
          <StudentTestCreatePage
            key={editingTest?.id ?? 'new'}
            test={editingTest}
            onCancel={() => {
              const returnSection = editingTest?.completed
                ? 'student-test-history'
                : 'student-test-manage';
              setEditingTest(null);
              setActiveSection(returnSection);
            }}
            onSaved={(savedTest, isUpdate) => {
              setEditingTest(null);
              setTestNotice(
                isUpdate
                  ? `O teste ${savedTest.name} foi atualizado com sucesso.`
                  : `O teste ${savedTest.name} foi criado com sucesso.`,
              );
              setActiveSection('student-test-manage');
            }}
          />
        </Suspense>
      ) : activeSection === 'student-test-manage' ||
        activeSection === 'student-test-history' ? (
        <Suspense fallback={<p>A carregar testes…</p>}>
          <StudentTestManagementPage
            key={activeSection}
            historyMode={activeSection === 'student-test-history'}
            successMessage={testNotice}
            onStatusChanged={(changedTest, completed) => {
              setTestNotice(
                completed
                  ? `O teste ${changedTest.name} foi concluído e movido para Histórico.`
                  : `O teste ${changedTest.name} foi reaberto e voltou para Gerir.`,
              );
              setActiveSection(
                completed ? 'student-test-history' : 'student-test-manage',
              );
            }}
            onEdit={(editedTest) => {
              setEditingTest(editedTest);
              setTestNotice('');
              setActiveSection('student-test-create');
            }}
            onCreate={() => {
              setEditingTest(null);
              setTestNotice('');
              setActiveSection('student-test-create');
            }}
          />
        </Suspense>
      ) : activeSection === 'student-exam-create' ? (
        <Suspense fallback={<p>A carregar formulário do exame…</p>}>
          <StudentExamCreatePage
            key={editingExam?.id ?? 'new'}
            exam={editingExam}
            onCancel={() => {
              const returnSection = editingExam?.completed
                ? 'student-exam-history'
                : 'student-exam-manage';
              setEditingExam(null);
              setActiveSection(returnSection);
            }}
            onSaved={(savedExam, isUpdate) => {
              setEditingExam(null);
              setExamNotice(
                isUpdate
                  ? `O exame ${savedExam.name} foi atualizado com sucesso.`
                  : `O exame ${savedExam.name} foi criado com sucesso.`,
              );
              setActiveSection('student-exam-manage');
            }}
          />
        </Suspense>
      ) : activeSection === 'student-exam-manage' ||
        activeSection === 'student-exam-history' ? (
        <Suspense fallback={<p>A carregar exames…</p>}>
          <StudentExamManagementPage
            key={activeSection}
            historyMode={activeSection === 'student-exam-history'}
            successMessage={examNotice}
            onStatusChanged={(changedExam, completed) => {
              setExamNotice(
                completed
                  ? `O exame ${changedExam.name} foi concluído e movido para Histórico.`
                  : `O exame ${changedExam.name} foi reaberto e voltou para Gerir.`,
              );
              setActiveSection(
                completed ? 'student-exam-history' : 'student-exam-manage',
              );
            }}
            onEdit={(editedExam) => {
              setEditingExam(editedExam);
              setExamNotice('');
              setActiveSection('student-exam-create');
            }}
            onCreate={() => {
              setEditingExam(null);
              setExamNotice('');
              setActiveSection('student-exam-create');
            }}
          />
        </Suspense>
      ) : currentStaffSection?.action === 'enroll' ? (
        <Suspense fallback={<p>A carregar formulário do funcionário…</p>}>
          <CurrentStaffEnrollmentPage
            staff={editingStaff}
            onCancel={() => {
              const returnSection =
                editingStaff?.active === false
                  ? `staff-${editingStaff.staffType}-history`
                  : `staff-${editingStaff?.staffType ?? currentStaffSection.type}-manage`;
              setEditingStaff(null);
              setActiveSection(returnSection);
            }}
            onSaved={(member, isUpdate) => {
              setEditingStaff(null);
              setStaffNotice(
                isUpdate
                  ? `Funcionário ${member.staffCode} atualizado com sucesso.`
                  : `Funcionário inscrito com sucesso. Código: ${member.staffCode}.`,
              );
              setActiveSection(
                `staff-${member.staffType}-${member.active ? 'manage' : 'history'}`,
              );
            }}
          />
        </Suspense>
      ) : staffSection(activeSection)?.action === 'manage' ||
        staffSection(activeSection)?.action === 'history' ? (
        <Suspense fallback={<p>A carregar funcionários…</p>}>
          <CurrentStaffManagementPage
            historyMode={currentStaffSection.action === 'history'}
            successMessage={staffNotice}
            onStatusChanged={(member, active) => {
              setStaffNotice(
                active
                  ? `${member.staffCode} foi ativado e voltou para Gerir.`
                  : `${member.staffCode} foi desativado e movido para Histórico.`,
              );
              setActiveSection(
                `staff-${member.staffType}-${active ? 'manage' : 'history'}`,
              );
            }}
            onEdit={(member) => {
              setEditingStaff(member);
              setStaffNotice('');
              setActiveSection(`staff-${member.staffType}-enroll`);
            }}
            onEnroll={(type) => {
              setEditingStaff(null);
              setStaffNotice('');
              setActiveSection(`staff-${type}-enroll`);
            }}
          />
        </Suspense>
      ) : activeSection === 'modules' ? (
        <Suspense fallback={<p>A carregar módulos…</p>}>
          <ModulesManagement />
        </Suspense>
      ) : activeSection === 'disciplines' ? (
        <DisciplinesManagement />
      ) : activeSection === 'categories' ? (
        <CategoriesManagement />
      ) : activeSection === 'levels' ? (
        <LevelsManagement />
      ) : activeSection === 'modalities' ? (
        <ModalitiesManagement />
      ) : activeSection === 'monthlyfees' ? (
        <MonthlyFeesManagement />
      ) : activeSection === 'enrollmentfees' ? (
        <EnrollmentFeesManagement />
      ) : activeSection === 'manualfees' ? (
        <ManualFeesManagement />
      ) : activeSection === 'online-classes-dashboard' ? (
        <Suspense fallback={<p>A carregar o Dashboard das aulas online…</p>}>
          <OnlineClassesDashboardPage />
        </Suspense>
      ) : activeSection.startsWith('online-platform-') ? (
        <Suspense fallback={<p>A carregar a plataforma…</p>}>
          <OnlineClassPlatformPage
            platform={activeSection.slice('online-platform-'.length)}
          />
        </Suspense>
      ) : activeSection === 'online-classes-register' ? (
        <Suspense fallback={<p>A carregar o formulário da aula…</p>}>
          <OnlineClassesRegistrationPage
            lesson={editingOnlineLesson}
            onCancel={() => {
              setEditingOnlineLesson(null);
              setActiveSection('online-classes-registered');
            }}
            onSaved={() => {
              setEditingOnlineLesson(null);
              setActiveSection('online-classes-registered');
            }}
          />
        </Suspense>
      ) : activeSection === 'online-classes-registered' ? (
        <Suspense fallback={<p>A carregar aulas online…</p>}>
          <OnlineClassesPage
            onEditLesson={(lesson) => {
              setEditingOnlineLesson(lesson);
              setActiveSection('online-classes-register');
            }}
          />
        </Suspense>
      ) : studentSectionLabels[activeSection] ? (
        <section className="cacoin-course-page">
          <header className="cacoin-page-heading">
            <div>
              <p className="cacoin-eyebrow">Estudantes</p>
              <h1>{studentSectionLabels[activeSection]}</h1>
            </div>
          </header>
          <p>Esta área será implementada na próxima etapa.</p>
        </section>
      ) : (
        <CoursesManagement />
      )}
    </Shell>
  );
}
