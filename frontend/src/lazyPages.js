import { lazy } from 'react';

export const StudentLookUpSearch = lazy(
  () => import('./pages/lookup/StudentLookUpSearch'),
);
export const ModulesManagement = lazy(
  () => import('./pages/modules/modules/ModulesManagement'),
);
export const StudentEnrollmentPage = lazy(
  () => import('./pages/students/StudentEnrollmentPage'),
);
export const StudentManagementPage = lazy(
  () => import('./pages/students/StudentManagementPage'),
);
export const StudentFeesManagement = lazy(
  () => import('./pages/students/StudentFeesManagement'),
);
export const StudentEnrollmentPayments = lazy(
  () => import('./pages/students/StudentEnrollmentPayments'),
);
export const StudentTestCreatePage = lazy(
  () => import('./pages/students/tests/StudentTestCreatePage'),
);
export const StudentTestManagementPage = lazy(
  () => import('./pages/students/tests/StudentTestManagementPage'),
);
export const StudentExamCreatePage = lazy(
  () => import('./pages/students/exams/StudentExamCreatePage'),
);
export const StudentExamManagementPage = lazy(
  () => import('./pages/students/exams/StudentExamManagementPage'),
);
export const TestDashboardPage = lazy(() => import('./pages/tests/TestDashboardPage'));
export const TestRegistrationPage = lazy(
  () => import('./pages/tests/TestRegistrationPage'),
);
export const TestSettingsManagement = lazy(
  () => import('./pages/settings/tests/TestSettingsManagement'),
);
export const ExamDashboardPage = lazy(() => import('./pages/exams/ExamDashboardPage'));
export const ExamRegistrationPage = lazy(
  () => import('./pages/exams/ExamRegistrationPage'),
);
export const ExamSettingsManagement = lazy(
  () => import('./pages/settings/exams/ExamSettingsManagement'),
);
export const UniformDashboardPage = lazy(
  () => import('./pages/uniforms/UniformDashboardPage'),
);
export const UniformOrderPage = lazy(
  () => import('./pages/uniforms/UniformOrderPage'),
);
export const UniformSettingsManagement = lazy(
  () => import('./pages/settings/uniforms/UniformSettingsManagement'),
);
export const GraduationDashboardPage = lazy(
  () => import('./pages/graduations/GraduationDashboardPage'),
);
export const GraduationRegistrationPage = lazy(
  () => import('./pages/graduations/GraduationRegistrationPage'),
);
export const GraduationParticipantsPage = lazy(
  () => import('./pages/graduations/GraduationParticipantsPage'),
);
export const GraduationGraduatesPage = lazy(
  () => import('./pages/graduations/GraduationGraduatesPage'),
);
export const GraduationSettingsManagement = lazy(
  () => import('./pages/settings/graduations/GraduationSettingsManagement'),
);
export const SuspensionDashboardPage = lazy(
  () => import('./pages/suspensions/SuspensionDashboardPage'),
);
export const SuspensionRegistrationPage = lazy(
  () => import('./pages/suspensions/SuspensionRegistrationPage'),
);
export const SuspensionSettingsManagement = lazy(
  () => import('./pages/settings/suspensions/SuspensionSettingsManagement'),
);
export const AttendanceDashboardPage = lazy(
  () => import('./pages/attendances/AttendanceDashboardPage'),
);
export const AttendanceRegisterPage = lazy(
  () => import('./pages/attendances/AttendanceRegisterPage'),
);
export const AttendanceTablesPage = lazy(
  () => import('./pages/attendances/AttendanceTablesPage'),
);
export const AssessmentNewRecordPage = lazy(
  () => import('./pages/assessments/AssessmentNewRecordPage'),
);
export const AssessmentPendingPage = lazy(
  () => import('./pages/assessments/AssessmentPendingPage'),
);
export const AssessmentGradesPage = lazy(
  () => import('./pages/assessments/AssessmentGradesPage'),
);
export const PautaDashboardPage = lazy(
  () => import('./pages/pautas/PautaDashboardPage'),
);
export const PautaNewPage = lazy(() => import('./pages/pautas/PautaNewPage'));
export const PautaListPage = lazy(() => import('./pages/pautas/PautaListPage'));
export const PautaSettingsManagement = lazy(
  () => import('./pages/settings/pautas/PautaSettingsManagement'),
);
export const StaffDocumentTypesPage = lazy(
  () => import('./pages/staff/documents/StaffDocumentTypesPage'),
);
export const StaffExpirationPage = lazy(
  () => import('./pages/staff/documents/StaffExpirationPage'),
);
export const FinanceDashboardPage = lazy(
  () => import('./pages/finance/FinanceDashboardPage'),
);
export const SalaryRegistrationPage = lazy(
  () => import('./pages/finance/SalaryRegistrationPage'),
);
export const SalaryPaymentsPage = lazy(
  () => import('./pages/finance/SalaryPaymentsPage'),
);
export const SalaryPendingPage = lazy(
  () => import('./pages/finance/SalaryPendingPage'),
);
export const SalaryDebtsPage = lazy(() => import('./pages/finance/SalaryDebtsPage'));
export const SalaryReportsPage = lazy(
  () => import('./pages/finance/SalaryReportsPage'),
);
export const FinanceSettingsManagement = lazy(
  () => import('./pages/settings/finance/FinanceSettingsManagement'),
);
export const PositionSettingsManagement = lazy(
  () => import('./pages/settings/finance/PositionSettingsManagement'),
);
export const OnlineClassesPage = lazy(
  () => import('./pages/onlineclasses/OnlineClassesPage'),
);
export const OnlineClassesDashboardPage = lazy(
  () => import('./pages/onlineclasses/OnlineClassesDashboardPage'),
);
export const OnlineClassPlatformPage = lazy(
  () => import('./pages/onlineclasses/OnlineClassPlatformPage'),
);
export const OnlineClassesRegistrationPage = lazy(
  () => import('./pages/onlineclasses/OnlineClassesRegistrationPage'),
);
export const OnlineClassesSettingsManagement = lazy(
  () => import('./pages/settings/onlineclasses/OnlineClassesSettingsManagement'),
);
export const OnlineAttendanceSettingsManagement = lazy(
  () => import('./pages/settings/onlineclasses/OnlineAttendanceSettingsManagement'),
);
export const LeaveDashboardPage = lazy(() => import('./pages/leaves/LeaveDashboardPage'));
export const LeaveRequestPage = lazy(() => import('./pages/leaves/LeaveRequestPage'));
export const PartitionSettingsManagement = lazy(
  () => import('./pages/settings/partitions/PartitionSettingsManagement'),
);
export const FineSettingsManagement = lazy(
  () => import('./pages/settings/fines/FineSettingsManagement'),
);
export const LeaveSettingsManagement = lazy(
  () => import('./pages/settings/leaves/LeaveSettingsManagement'),
);
export const MobileMoneySettingsManagement = lazy(
  () => import('./pages/settings/mobilemoney/MobileMoneySettingsManagement'),
);
export const MobileMoneyPayPage = lazy(() => import('./pages/mobilemoney/MobileMoneyPayPage'));
export const MobileMoneyTransactionsPage = lazy(
  () => import('./pages/mobilemoney/MobileMoneyTransactionsPage'),
);
export const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
export const UserAccountsPage = lazy(() => import('./pages/users/UserAccountsPage'));
export const UserDashboardPage = lazy(() => import('./pages/users/UserDashboardPage'));
export const UserLogsManagement = lazy(
  () => import('./pages/settings/users/UserLogsManagement'),
);
export const UserSettingsManagement = lazy(
  () => import('./pages/settings/users/UserSettingsManagement'),
);
export const StudentRequestDashboardPage = lazy(
  () => import('./pages/requests/StudentRequestDashboardPage'),
);
export const StudentRequestPage = lazy(() => import('./pages/requests/StudentRequestPage'));
export const RequestSettingsManagement = lazy(
  () => import('./pages/settings/requests/RequestSettingsManagement'),
);
export const ExpensesDashboardPage = lazy(
  () => import('./pages/expenses/ExpensesDashboardPage'),
);
export const ExpenseRecordsPage = lazy(() => import('./pages/expenses/ExpenseRecordsPage'));
export const ReturnRequestPage = lazy(() => import('./pages/expenses/ReturnRequestPage'));
export const ExpenseSettingsManagement = lazy(
  () => import('./pages/settings/expenses/ExpenseSettingsManagement'),
);
export const NotificationDashboardPage = lazy(
  () => import('./pages/notifications/NotificationDashboardPage'),
);
export const NotificationMessagesPage = lazy(
  () => import('./pages/notifications/NotificationMessagesPage'),
);
export const NotificationSettingsManagement = lazy(
  () => import('./pages/settings/notifications/NotificationSettingsManagement'),
);
export const StaffAttendanceDashboardPage = lazy(
  () => import('./pages/staffattendances/StaffAttendanceDashboardPage'),
);
export const StaffAttendanceRegisterPage = lazy(
  () => import('./pages/staffattendances/StaffAttendanceRegisterPage'),
);
export const StaffAttendanceTablesPage = lazy(
  () => import('./pages/staffattendances/StaffAttendanceTablesPage'),
);
