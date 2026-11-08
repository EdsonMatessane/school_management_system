package mz.cacoin.dashboard;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.function.ToLongFunction;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import mz.cacoin.assessments.AssessmentGradeRepository;
import mz.cacoin.assessments.AssessmentSheetRepository;
import mz.cacoin.attendances.AttendanceRecord;
import mz.cacoin.attendances.AttendanceRecordRepository;
import mz.cacoin.audit.UserLog;
import mz.cacoin.audit.UserLogRepository;
import mz.cacoin.courses.Course;
import mz.cacoin.courses.CourseRepository;
import mz.cacoin.exams.ExamRegistration;
import mz.cacoin.exams.ExamRegistrationRepository;
import mz.cacoin.expenses.Expense;
import mz.cacoin.expenses.ExpenseRepository;
import mz.cacoin.expenses.Purchase;
import mz.cacoin.expenses.PurchaseRepository;
import mz.cacoin.expenses.PurchaseReturn;
import mz.cacoin.expenses.PurchaseReturnRepository;
import mz.cacoin.expenses.Sale;
import mz.cacoin.expenses.SaleRepository;
import mz.cacoin.finance.FinancePosition;
import mz.cacoin.finance.FinancePositionRepository;
import mz.cacoin.finance.SalaryPayment;
import mz.cacoin.finance.SalaryPaymentRepository;
import mz.cacoin.folder.FolderRepository;
import mz.cacoin.graduations.GraduateRepository;
import mz.cacoin.graduations.GraduationRegistration;
import mz.cacoin.graduations.GraduationRegistrationRepository;
import mz.cacoin.internalexpenses.InternalExpense;
import mz.cacoin.internalexpenses.InternalExpenseRepository;
import mz.cacoin.leaves.LeaveRequest;
import mz.cacoin.leaves.LeaveRequestRepository;
import mz.cacoin.modules.disciplines.DisciplineRepository;
import mz.cacoin.modules.ModuleRepository;
import mz.cacoin.notifications.NotificationMessage;
import mz.cacoin.notifications.NotificationMessageRepository;
import mz.cacoin.onlineclasses.OnlineAttendanceRepository;
import mz.cacoin.onlineclasses.OnlineLesson;
import mz.cacoin.onlineclasses.OnlineLessonRepository;
import mz.cacoin.pautas.PautaEntry;
import mz.cacoin.pautas.PautaEntryRepository;
import mz.cacoin.requests.StudentRequest;
import mz.cacoin.requests.StudentRequestRepository;
import mz.cacoin.settings.SystemDate;
import mz.cacoin.settings.SystemSettings;
import mz.cacoin.settings.SystemSettingsRepository;
import mz.cacoin.staff.StaffMember;
import mz.cacoin.staff.StaffRepository;
import mz.cacoin.staffattendances.StaffAttendanceRecord;
import mz.cacoin.staffattendances.StaffAttendanceRecordRepository;
import mz.cacoin.staffdocuments.StaffDocument;
import mz.cacoin.staffdocuments.StaffDocumentRepository;
import mz.cacoin.statuses.StatusModules;
import mz.cacoin.statuses.SystemStatus;
import mz.cacoin.statuses.SystemStatusService;
import mz.cacoin.students.Student;
import mz.cacoin.students.StudentEnrollment;
import mz.cacoin.students.StudentEnrollmentRepository;
import mz.cacoin.students.exams.StudentExamRepository;
import mz.cacoin.students.StudentFeeCharge;
import mz.cacoin.students.StudentFeeChargeRepository;
import mz.cacoin.students.StudentFeePayment;
import mz.cacoin.students.StudentFeePaymentRepository;
import mz.cacoin.students.StudentRepository;
import mz.cacoin.students.tests.StudentTestRepository;
import mz.cacoin.suspensions.SuspensionRegistration;
import mz.cacoin.suspensions.SuspensionRegistrationRepository;
import mz.cacoin.tasks.Task;
import mz.cacoin.tasks.TaskRepository;
import mz.cacoin.tests.TestRegistration;
import mz.cacoin.tests.TestRegistrationRepository;
import mz.cacoin.uniforms.UniformOrder;
import mz.cacoin.uniforms.UniformOrderRepository;
import mz.cacoin.users.UserAccount;
import mz.cacoin.users.UserAccountRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DashboardService {
  private static final Locale PT = Locale.forLanguageTag("pt-MZ");
  private static final Map<String, String> METHODS = Map.of(
      "CASH", "Numerário", "BANK_TRANSFER", "Transferência Bancária", "POS", "POS", "OTHER", "Outro");
  private static final Map<String, String> FEE_TYPES =
      Map.of("MONTHLY", "Mensalidade", "ENROLLMENT", "Inscrição", "MANUAL", "Manual");
  private static final Map<String, String> TASK_STATUSES = Map.of(
      "TODO", "A fazer", "IN_PROGRESS", "Em curso", "BLOCKED", "Bloqueada", "DONE", "Concluída");
  private static final Map<String, String> ACTIONS =
      Map.of("CREATE", "Criações", "UPDATE", "Edições", "DELETE", "Remoções", "LOGIN", "Inícios de sessão");
  private static final Map<String, String> STAFF_TYPES =
      Map.of("hr", "Recursos Humanos", "teachers", "Professores", "other", "Outros");
  private static final Map<String, String> ACCOUNT_KINDS =
      Map.of("ADMIN", "Administradores", "STUDENT", "Estudantes", "STAFF", "Funcionários");

  private final StudentRepository students;
  private final StudentEnrollmentRepository enrollments;
  private final StudentFeeChargeRepository charges;
  private final StudentFeePaymentRepository payments;
  private final StudentExamRepository studentExams;
  private final StudentTestRepository studentTests;
  private final StudentRequestRepository studentRequests;
  private final StaffRepository staff;
  private final StaffDocumentRepository staffDocuments;
  private final StaffAttendanceRecordRepository staffAttendances;
  private final FinancePositionRepository positions;
  private final SalaryPaymentRepository salaries;
  private final LeaveRequestRepository leaves;
  private final CourseRepository courses;
  private final ModuleRepository modules;
  private final DisciplineRepository disciplines;
  private final AttendanceRecordRepository attendances;
  private final ExamRegistrationRepository examRegistrations;
  private final TestRegistrationRepository testRegistrations;
  private final PautaEntryRepository pautas;
  private final AssessmentSheetRepository assessmentSheets;
  private final AssessmentGradeRepository assessmentGrades;
  private final OnlineLessonRepository lessons;
  private final OnlineAttendanceRepository onlineAttendances;
  private final GraduationRegistrationRepository graduationRegistrations;
  private final GraduateRepository graduates;
  private final SuspensionRegistrationRepository suspensions;
  private final UniformOrderRepository uniformOrders;
  private final ExpenseRepository expenses;
  private final PurchaseRepository purchases;
  private final SaleRepository sales;
  private final PurchaseReturnRepository purchaseReturns;
  private final InternalExpenseRepository internalExpenses;
  private final TaskRepository tasks;
  private final NotificationMessageRepository notifications;
  private final FolderRepository folders;
  private final UserAccountRepository accounts;
  private final UserLogRepository logs;
  private final SystemSettingsRepository systemSettings;
  private final SystemStatusService statuses;

  @Transactional(readOnly = true)
  public DashboardDtos.Response summary() {
    SystemSettings settings = systemSettings.findById(1L).orElseGet(SystemSettings::new);
    ZoneId zone = ZoneId.of(settings.getTimeZone());
    LocalDate today = SystemDate.today();
    YearMonth current = YearMonth.from(today);
    List<YearMonth> months = new ArrayList<>();
    for (int offset = 11; offset >= 0; offset--) months.add(current.minusMonths(offset));

    List<Student> studentList = students.findAll();
    List<StudentEnrollment> enrollmentList = enrollments.findAll();
    Map<Long, StudentEnrollment> latestEnrollment = new HashMap<>();
    for (StudentEnrollment enrollment : enrollmentList) {
      latestEnrollment.merge(enrollment.getStudent().getId(), enrollment,
          (first, second) -> first.getId() > second.getId() ? first : second);
    }
    List<StudentFeeCharge> chargeList = charges.findAll();
    List<StudentFeePayment> paymentList = payments.findAll();
    Map<Long, BigDecimal> paidByCharge = new HashMap<>();
    for (StudentFeePayment payment : paymentList) {
      paidByCharge.merge(payment.getCharge().getId(), money(payment.getAmount()), BigDecimal::add);
    }
    List<StaffMember> staffList = staff.findAll();
    List<SalaryPayment> salaryList = salaries.findAll();
    List<Expense> expenseList = expenses.findAll();
    List<Purchase> purchaseList = purchases.findAll();
    List<Sale> saleList = sales.findAll();
    List<PurchaseReturn> returnList = purchaseReturns.findAll();
    List<InternalExpense> internalList = internalExpenses.findAll();
    List<UniformOrder> uniformList = uniformOrders.findAll();
    List<ExamRegistration> examList = examRegistrations.findAll();
    List<TestRegistration> testList = testRegistrations.findAll();
    List<GraduationRegistration> graduationList = graduationRegistrations.findAll();
    List<SuspensionRegistration> suspensionList = suspensions.findAll();
    List<AttendanceRecord> attendanceList = attendances.findAll();
    List<StaffAttendanceRecord> staffAttendanceList = staffAttendances.findAll();
    List<LeaveRequest> leaveList = leaves.findAll();
    List<Task> taskList = tasks.findAll().stream().filter(task -> !task.isArchived()).toList();
    List<StudentRequest> requestList = studentRequests.findAll();
    List<NotificationMessage> notificationList = notifications.findAll();
    List<OnlineLesson> lessonList = lessons.findAll();
    List<UserAccount> accountList = accounts.findAll();
    List<UserLog> logList = logs.findAllByOrderByCreatedAtDescIdDesc(PageRequest.of(0, 20_000));

    BigDecimal billed = sum(chargeList, StudentFeeCharge::getAmount);
    BigDecimal received = sum(paymentList, StudentFeePayment::getAmount);
    BigDecimal outstanding = BigDecimal.ZERO;
    BigDecimal overdue = BigDecimal.ZERO;
    long overdueCount = 0;
    long paidCharges = 0;
    long partialCharges = 0;
    long unpaidCharges = 0;
    Map<String, BigDecimal> debtByCourse = new LinkedHashMap<>();
    for (StudentFeeCharge charge : chargeList) {
      BigDecimal paid = paidByCharge.getOrDefault(charge.getId(), BigDecimal.ZERO);
      BigDecimal remaining = money(charge.getAmount()).subtract(paid).max(BigDecimal.ZERO);
      if (remaining.signum() == 0) {
        paidCharges++;
        continue;
      }
      if (paid.signum() > 0) partialCharges++; else unpaidCharges++;
      outstanding = outstanding.add(remaining);
      debtByCourse.merge(Objects.requireNonNullElse(charge.getEnrollment().getCourseName(), "—"),
          remaining, BigDecimal::add);
      if (charge.getDueDate() != null && charge.getDueDate().isBefore(today)) {
        overdue = overdue.add(remaining);
        overdueCount++;
      }
    }
    BigDecimal receivedMonth = sumWhere(paymentList, StudentFeePayment::getAmount,
        item -> item.getPaymentDate() != null && YearMonth.from(item.getPaymentDate()).equals(current));
    BigDecimal receivedYear = sumWhere(paymentList, StudentFeePayment::getAmount,
        item -> item.getPaymentDate() != null && item.getPaymentDate().getYear() == today.getYear());

    Map<YearMonth, BigDecimal> revenueByMonth = byMonth(paymentList, StudentFeePayment::getPaymentDate, StudentFeePayment::getAmount);
    Map<YearMonth, BigDecimal> salaryByMonth = byMonth(salaryList, SalaryPayment::getReferenceMonth, SalaryPayment::getPaidAmount);
    Map<YearMonth, BigDecimal> expenseByMonth = byMonth(expenseList, Expense::getServiceDate, Expense::getRequestedAmount);
    Map<YearMonth, BigDecimal> purchaseByMonth = byMonth(purchaseList, Purchase::getAcquisitionDate, Purchase::getTotalPrice);
    Map<YearMonth, BigDecimal> internalByMonth = byMonth(internalExpenseApproved(internalList), InternalExpense::getExpenseDate, InternalExpense::getApprovedAmount);
    Map<YearMonth, BigDecimal> outflowByMonth = new HashMap<>();
    for (Map<YearMonth, BigDecimal> source : List.of(salaryByMonth, expenseByMonth, purchaseByMonth, internalByMonth)) {
      source.forEach((month, value) -> outflowByMonth.merge(month, value, BigDecimal::add));
    }
    Map<YearMonth, BigDecimal> enrollmentsByMonth = new HashMap<>();
    for (StudentEnrollment enrollment : enrollmentList) {
      LocalDate date = enrollment.getEnrollmentDate() != null
          ? enrollment.getEnrollmentDate()
          : enrollment.getCreatedAt() == null ? null : enrollment.getCreatedAt().atZone(zone).toLocalDate();
      if (date != null) enrollmentsByMonth.merge(YearMonth.from(date), BigDecimal.ONE, BigDecimal::add);
    }

    long activeStudents = studentList.stream().filter(Student::isActive).count();
    long activeStaff = staffList.stream().filter(StaffMember::isActive).count();
    long pendingRequests = requestList.stream().filter(item -> "PENDING".equals(item.getStatus())).count();
    long pendingLeaves = leaveList.stream().filter(item -> "PENDING_APPROVAL".equals(item.getStatus())).count();
    LocalDateTime now = LocalDateTime.now(zone);
    long openTasks = taskList.stream().filter(task -> !"DONE".equals(task.getStatus())).count();
    long lateTasks = taskList.stream()
        .filter(task -> !"DONE".equals(task.getStatus()) && task.getDueAt() != null && task.getDueAt().isBefore(now))
        .count();

    Function<String, String> requestLabel = labeler(StatusModules.REQUESTS);
    Function<String, String> leaveLabel = labeler(StatusModules.LEAVES);
    Function<String, String> expenseLabel = labeler(StatusModules.EXPENSES);
    Function<String, String> purchaseLabel = labeler(StatusModules.PURCHASES);
    Function<String, String> saleLabel = labeler(StatusModules.SALES);
    Function<String, String> returnLabel = labeler(StatusModules.RETURNS);
    Function<String, String> notificationLabel = labeler(StatusModules.NOTIFICATIONS);
    Function<String, String> presenceLabel = labeler(StatusModules.ATTENDANCE_PRESENCE);
    Function<String, String> userLabel = labeler(StatusModules.USERS);

    List<DashboardDtos.Tab> tabs = new ArrayList<>();

    tabs.add(new DashboardDtos.Tab("overview", "Geral", List.of(
        kpi("students", "Estudantes", studentList.size(), "number", activeStudents + " activos"),
        kpi("staff", "Funcionários", staffList.size(), "number", activeStaff + " activos"),
        kpi("courses", "Cursos", courses.count(), "number", modules.count() + " módulos · " + disciplines.count() + " disciplinas"),
        kpi("enrollmentsMonth", "Inscrições no mês", enrollmentsByMonth.getOrDefault(current, BigDecimal.ZERO), "number", "Total: " + enrollmentList.size()),
        kpi("receivedMonth", "Receita do mês", receivedMonth, "money", "No ano: " + plain(receivedYear)),
        kpi("outstanding", "Em dívida", outstanding, "money", overdueCount + " cobranças em atraso"),
        kpi("requests", "Pedidos pendentes", pendingRequests, "number", requestList.size() + " no total"),
        kpi("tasks", "Tarefas abertas", openTasks, "number", lateTasks + " em atraso"),
        kpi("leaves", "Saídas por aprovar", pendingLeaves, "number", leaveList.size() + " registadas"),
        kpi("accounts", "Contas de usuário", accountList.size(), "number", "Inclui administradores, funcionários e estudantes")),
        List.of(
            monthsChart("cashflow", "Receitas vs. despesas (12 meses)", "line", months,
                Map.of("Receitas", revenueByMonth, "Despesas", outflowByMonth), List.of("Receitas", "Despesas")),
            monthsChart("enrollments", "Inscrições por mês", "bar", months,
                Map.of("Inscrições", enrollmentsByMonth), List.of("Inscrições")),
            pie("studentStatus", "Estudantes por estado", counts(studentList, item -> item.isActive() ? "Activos" : "Inactivos")),
            pie("requestsStatus", "Pedidos por estado", counts(requestList, item -> requestLabel.apply(item.getStatus()))))));

    tabs.add(new DashboardDtos.Tab("students", "Estudantes", List.of(
        kpi("total", "Total de estudantes", studentList.size(), "number", activeStudents + " activos"),
        kpi("inactive", "Inactivos", studentList.size() - activeStudents, "number", null),
        kpi("newYear", "Novos este ano", studentList.stream().filter(item -> Objects.equals(item.getStudentYear(), today.getYear())).count(), "number", "Ano " + today.getYear()),
        kpi("enrollments", "Inscrições", enrollmentList.size(), "number", null),
        kpi("suspended", "Trancados", suspensionList.stream().filter(SuspensionRegistration::isSuspended).count(), "number", suspensionList.size() + " registos"),
        kpi("graduates", "Formados", graduates.count(), "number", graduationList.size() + " inscritos na graduação"),
        kpi("uniforms", "Uniformes entregues", uniformList.stream().filter(UniformOrder::isDelivered).count(), "number", uniformList.size() + " encomendas"),
        kpi("withoutPhone", "Sem telefone", studentList.stream().filter(item -> item.getPhone() == null || item.getPhone().isBlank()).count(), "number", null)),
        List.of(
            bar("byCourse", "Estudantes por curso", counts(latestEnrollment.values(), StudentEnrollment::getCourseName), 10),
            pie("byCategory", "Por categoria", counts(latestEnrollment.values(), StudentEnrollment::getCategoryName)),
            pie("byLevel", "Por nível", counts(latestEnrollment.values(), StudentEnrollment::getLevelName)),
            pie("byModality", "Por modalidade", counts(latestEnrollment.values(), StudentEnrollment::getModalityName)),
            pie("byGender", "Por género", counts(studentList, Student::getGender)),
            bar("byYear", "Estudantes por ano de registo", counts(studentList, item -> String.valueOf(item.getStudentYear())), 12),
            monthsChart("enrollmentsMonthly", "Inscrições por mês", "line", months,
                Map.of("Inscrições", enrollmentsByMonth), List.of("Inscrições")))));

    tabs.add(new DashboardDtos.Tab("finance", "Finanças", List.of(
        kpi("billed", "Facturado", billed, "money", chargeList.size() + " cobranças"),
        kpi("received", "Recebido", received, "money", paymentList.size() + " pagamentos"),
        kpi("outstanding", "Em dívida", outstanding, "money", unpaidCharges + " por pagar · " + partialCharges + " parciais"),
        kpi("overdue", "Em atraso", overdue, "money", overdueCount + " cobranças vencidas"),
        kpi("rate", "Taxa de cobrança", billed.signum() == 0 ? BigDecimal.ZERO : received.multiply(BigDecimal.valueOf(100)).divide(billed, 1, java.math.RoundingMode.HALF_UP), "percent", paidCharges + " cobranças liquidadas"),
        kpi("receivedYear", "Recebido no ano", receivedYear, "money", "Ano " + today.getYear()),
        kpi("salaries", "Salários pagos", sum(salaryList, SalaryPayment::getPaidAmount), "money", salaryList.size() + " pagamentos"),
        kpi("otherRevenue", "Outras receitas", otherRevenue(examList, testList, uniformList, graduationList, suspensionList, attendanceList), "money", "Exames, testes, uniformes, graduações, trancamentos e justificações")),
        List.of(
            monthsChart("revenueMonthly", "Receita por mês", "bar", months,
                Map.of("Receita", revenueByMonth), List.of("Receita")),
            monthsChart("outflowMonthly", "Despesas por mês", "bar", months,
                Map.of("Despesas", outflowByMonth), List.of("Despesas")),
            pie("methods", "Pagamentos por método", sumBy(paymentList, item -> METHODS.getOrDefault(item.getMethod(), Objects.toString(item.getMethod(), "—")), StudentFeePayment::getAmount)),
            pie("feeTypes", "Cobranças por tipo", sumBy(chargeList, item -> FEE_TYPES.getOrDefault(item.getFeeType(), item.getFeeType()), StudentFeeCharge::getAmount)),
            bar("debtByCourse", "Dívida por curso", debtByCourse, 10),
            pie("chargeStatus", "Estado das cobranças", orderedCounts(Map.of("Pagas", paidCharges, "Parciais", partialCharges, "Por pagar", unpaidCharges))))));

    Map<String, BigDecimal> examByType = counts(examList, ExamRegistration::getExamType);
    Map<String, BigDecimal> testByType = counts(testList, TestRegistration::getTestType);
    tabs.add(new DashboardDtos.Tab("academic", "Académico", List.of(
        kpi("courses", "Cursos activos", courses.findAll().stream().filter(Course::isActive).count(), "number", courses.count() + " no total"),
        kpi("modules", "Módulos", modules.count(), "number", null),
        kpi("disciplines", "Disciplinas", disciplines.count(), "number", null),
        kpi("exams", "Exames", studentExams.count(), "number", examList.size() + " inscrições"),
        kpi("tests", "Testes", studentTests.count(), "number", testList.size() + " inscrições"),
        kpi("pautas", "Pautas", pautas.count(), "number", assessmentSheets.count() + " folhas · " + assessmentGrades.count() + " notas"),
        kpi("lessons", "Aulas online", lessonList.size(), "number", lessonList.stream().filter(item -> item.getStartAt() != null && item.getStartAt().toInstant().isAfter(Instant.now())).count() + " agendadas"),
        kpi("attendance", "Taxa de presença", attendanceRate(attendanceList), "percent", attendanceList.size() + " registos")),
        List.of(
            pie("presence", "Presenças por estado", counts(attendanceList, item -> presenceLabel.apply(item.getStatus()))),
            monthsChart("absences", "Faltas por mês", "bar", months,
                Map.of("Faltas", byMonth(attendanceList.stream().filter(item -> "ABSENT".equals(item.getStatus())).toList(), AttendanceRecord::getAttendanceDate, item -> BigDecimal.ONE)), List.of("Faltas")),
            bar("examTypes", "Inscrições em exames por tipo", examByType, 10),
            bar("testTypes", "Inscrições em testes por tipo", testByType, 10),
            pie("pautaResults", "Resultados das pautas", counts(pautas.findAll(), PautaEntry::getResult)),
            monthsChart("lessonsMonthly", "Aulas online por mês", "line", months,
                Map.of("Aulas", byMonthTime(lessonList, OnlineLesson::getStartAt, zone)), List.of("Aulas")))));

    Map<Long, String> positionNames = positions.findAll().stream()
        .collect(Collectors.toMap(FinancePosition::getId, FinancePosition::getName));
    tabs.add(new DashboardDtos.Tab("staff", "Funcionários", List.of(
        kpi("total", "Funcionários", staffList.size(), "number", activeStaff + " activos"),
        kpi("teachers", "Professores", staffList.stream().filter(item -> "teachers".equals(item.getStaffType())).count(), "number", null),
        kpi("hr", "Recursos humanos", staffList.stream().filter(item -> "hr".equals(item.getStaffType())).count(), "number", null),
        kpi("leavesPending", "Saídas por aprovar", pendingLeaves, "number", leaveList.size() + " no total"),
        kpi("absencesMonth", "Faltas no mês", staffAttendanceList.stream().filter(item -> "ABSENT".equals(item.getStatus()) && item.getAttendanceDate() != null && YearMonth.from(item.getAttendanceDate()).equals(current)).count(), "number", staffAttendanceList.size() + " registos"),
        kpi("salaryMonth", "Salários pagos no mês", salaryByMonth.getOrDefault(current, BigDecimal.ZERO), "money", null),
        kpi("documents", "Documentos a expirar (30 dias)", staffDocuments.findAll().stream().filter(item -> expiresSoon(item, today)).count(), "number", staffDocuments.count() + " documentos"),
        kpi("withoutPosition", "Sem cargo", staffList.stream().filter(item -> item.getPositionId() == null).count(), "number", null)),
        List.of(
            pie("staffTypes", "Funcionários por tipo", counts(staffList, item -> STAFF_TYPES.getOrDefault(item.getStaffType(), item.getStaffType()))),
            bar("positions", "Por cargo", counts(staffList, item -> item.getPositionId() == null ? "Sem cargo" : positionNames.getOrDefault(item.getPositionId(), "—")), 10),
            pie("leaves", "Saídas por estado", counts(leaveList, item -> leaveLabel.apply(item.getStatus()))),
            monthsChart("staffAbsences", "Faltas de funcionários por mês", "bar", months,
                Map.of("Faltas", byMonth(staffAttendanceList.stream().filter(item -> "ABSENT".equals(item.getStatus())).toList(), StaffAttendanceRecord::getAttendanceDate, item -> BigDecimal.ONE)), List.of("Faltas")),
            monthsChart("salaryMonthly", "Salários pagos por mês", "bar", months,
                Map.of("Salários", salaryByMonth), List.of("Salários")))));

    tabs.add(new DashboardDtos.Tab("operations", "Operações", List.of(
        kpi("expenses", "Despesas", sum(expenseList, Expense::getRequestedAmount), "money", expenseList.size() + " registos"),
        kpi("purchases", "Compras", sum(purchaseList, Purchase::getTotalPrice), "money", purchaseList.size() + " registos"),
        kpi("sales", "Vendas", sum(saleList, Sale::getTotalPrice), "money", saleList.size() + " registos"),
        kpi("returns", "Devoluções", sum(returnList, PurchaseReturn::getTotalPrice), "money", returnList.size() + " registos"),
        kpi("internal", "Despesas internas", sum(internalList, InternalExpense::getTotalAmount), "money", internalList.stream().filter(item -> "APPROVED".equals(item.getApprovalStatus())).count() + " aprovadas"),
        kpi("uniforms", "Encomendas de uniformes", uniformList.size(), "number", uniformList.stream().filter(UniformOrder::isPaid).count() + " pagas"),
        kpi("graduations", "Inscritos na graduação", graduationList.size(), "number", graduationList.stream().filter(GraduationRegistration::isGraduated).count() + " graduados"),
        kpi("folders", "Pastas", folders.count(), "number", null)),
        List.of(
            pie("expenseStatus", "Despesas por estado", sumBy(expenseList, item -> expenseLabel.apply(item.getStatus()), Expense::getRequestedAmount)),
            pie("purchaseStatus", "Compras por estado", counts(purchaseList, item -> purchaseLabel.apply(item.getStatus()))),
            pie("saleStatus", "Vendas por estado", counts(saleList, item -> saleLabel.apply(item.getStatus()))),
            pie("returnStatus", "Devoluções por estado", counts(returnList, item -> returnLabel.apply(item.getStatus()))),
            pie("internalStatus", "Despesas internas por aprovação", counts(internalList, InternalExpense::getApprovalStatus)),
            pie("uniformStatus", "Uniformes", orderedCounts(Map.of(
                "Entregues", uniformList.stream().filter(UniformOrder::isDelivered).count(),
                "Pagos por entregar", uniformList.stream().filter(item -> item.isPaid() && !item.isDelivered()).count(),
                "Por pagar", uniformList.stream().filter(item -> !item.isPaid()).count()))),
            pie("tasks", "Tarefas por estado", counts(taskList, item -> TASK_STATUSES.getOrDefault(item.getStatus(), item.getStatus()))),
            pie("notifications", "Notificações por estado", counts(notificationList, item -> notificationLabel.apply(item.getStatus()))),
            pie("notificationChannels", "Notificações por canal", counts(notificationList, NotificationMessage::getChannel)))));

    tabs.add(new DashboardDtos.Tab("system", "Sistema", List.of(
        kpi("accounts", "Contas de usuário", accountList.size(), "number", null),
        kpi("activeAccounts", "Contas activas", accountList.stream().filter(item -> UserAccount.ACTIVE.equals(item.getStatus())).count(), "number", null),
        kpi("locked", "Contas autobloqueadas", accountList.stream().filter(item -> UserAccount.LOCKED.equals(item.getStatus())).count(), "number", null),
        kpi("logs", "Logs registados", logList.size(), "number", "Apagados de 2 em 2 meses"),
        kpi("requestsTotal", "Pedidos de estudantes", requestList.size(), "number", pendingRequests + " pendentes")),
        List.of(
            pie("kinds", "Contas por tipo", counts(accountList, item -> ACCOUNT_KINDS.getOrDefault(item.getKind(), item.getKind()))),
            pie("accountStatus", "Contas por estado", counts(accountList, item -> userLabel.apply(item.getStatus()))),
            pie("logActions", "Logs por acção", counts(logList, item -> ACTIONS.getOrDefault(item.getAction(), item.getAction()))),
            bar("logUsers", "Utilizadores com mais actividade", counts(logList, UserLog::getActorCode), 10),
            bar("requestTypes", "Pedidos por tipo", counts(requestList, item -> item.getType().getName()), 10))));

    return new DashboardDtos.Response(Instant.now(), settings.getCurrency(), tabs);
  }

  private List<InternalExpense> internalExpenseApproved(List<InternalExpense> list) {
    return list.stream().filter(item -> item.getApprovedAmount() != null).toList();
  }

  private boolean expiresSoon(StaffDocument document, LocalDate today) {
    return document.getExpiryDate() != null
        && !document.getExpiryDate().isBefore(today)
        && !document.getExpiryDate().isAfter(today.plusDays(30));
  }

  private BigDecimal attendanceRate(List<AttendanceRecord> records) {
    if (records.isEmpty()) return BigDecimal.ZERO;
    long present = records.stream().filter(item -> !"ABSENT".equals(item.getStatus())).count();
    return BigDecimal.valueOf(present * 1000 / records.size(), 1);
  }

  private BigDecimal otherRevenue(
      List<ExamRegistration> exams, List<TestRegistration> tests, List<UniformOrder> uniforms,
      List<GraduationRegistration> graduationList, List<SuspensionRegistration> suspensionList,
      List<AttendanceRecord> attendanceList) {
    return sum(exams, ExamRegistration::getPaidAmount)
        .add(sum(tests, TestRegistration::getPaidAmount))
        .add(sumWhere(uniforms, UniformOrder::getAmount, UniformOrder::isPaid))
        .add(sumWhere(graduationList, GraduationRegistration::getAmount, GraduationRegistration::isPaid))
        .add(sumWhere(suspensionList, SuspensionRegistration::getAmount, SuspensionRegistration::isPaid))
        .add(sumWhere(attendanceList, AttendanceRecord::getJustificationFee, AttendanceRecord::isJustificationPaid));
  }

  private Function<String, String> labeler(String module) {
    Map<String, SystemStatus> lookup = statuses.lookup(module);
    return code -> {
      if (code == null) return "—";
      SystemStatus status = lookup.get(code);
      return status == null ? code : status.getLabel();
    };
  }

  private static BigDecimal money(BigDecimal value) {
    return value == null ? BigDecimal.ZERO : value;
  }

  private static String plain(BigDecimal value) {
    return value.stripTrailingZeros().toPlainString();
  }

  private static <T> BigDecimal sum(Collection<T> items, Function<T, BigDecimal> getter) {
    return items.stream().map(getter).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  private static <T> BigDecimal sumWhere(
      Collection<T> items, Function<T, BigDecimal> getter, Predicate<T> filter) {
    return items.stream().filter(filter).map(getter).filter(Objects::nonNull)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  private static <T> Map<String, BigDecimal> counts(Collection<T> items, Function<T, String> key) {
    Map<String, BigDecimal> result = new LinkedHashMap<>();
    for (T item : items) {
      String label = key.apply(item);
      result.merge(label == null || label.isBlank() ? "—" : label, BigDecimal.ONE, BigDecimal::add);
    }
    return result;
  }

  private static <T> Map<String, BigDecimal> sumBy(
      Collection<T> items, Function<T, String> key, Function<T, BigDecimal> value) {
    Map<String, BigDecimal> result = new LinkedHashMap<>();
    for (T item : items) {
      String label = key.apply(item);
      result.merge(label == null || label.isBlank() ? "—" : label, money(value.apply(item)), BigDecimal::add);
    }
    return result;
  }

  private static Map<String, BigDecimal> orderedCounts(Map<String, Long> values) {
    Map<String, BigDecimal> result = new LinkedHashMap<>();
    values.entrySet().stream()
        .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
        .forEach(entry -> result.put(entry.getKey(), BigDecimal.valueOf(entry.getValue())));
    return result;
  }

  private static <T> Map<YearMonth, BigDecimal> byMonth(
      Collection<T> items, Function<T, LocalDate> date, Function<T, BigDecimal> value) {
    Map<YearMonth, BigDecimal> result = new HashMap<>();
    for (T item : items) {
      LocalDate when = date.apply(item);
      BigDecimal amount = value.apply(item);
      if (when != null && amount != null) {
        result.merge(YearMonth.from(when), amount, BigDecimal::add);
      }
    }
    return result;
  }

  private static <T> Map<YearMonth, BigDecimal> byMonthTime(
      Collection<T> items, Function<T, java.time.OffsetDateTime> time, ZoneId zone) {
    Map<YearMonth, BigDecimal> result = new HashMap<>();
    for (T item : items) {
      java.time.OffsetDateTime when = time.apply(item);
      if (when != null) {
        result.merge(YearMonth.from(when.atZoneSameInstant(zone)), BigDecimal.ONE, BigDecimal::add);
      }
    }
    return result;
  }

  private static DashboardDtos.Kpi kpi(String key, String label, long value, String format, String detail) {
    return new DashboardDtos.Kpi(key, label, BigDecimal.valueOf(value), format, detail);
  }

  private static DashboardDtos.Kpi kpi(
      String key, String label, BigDecimal value, String format, String detail) {
    return new DashboardDtos.Kpi(key, label, value, format, detail);
  }

  private static DashboardDtos.Kpi kpi(String key, String label, int value, String format, String detail) {
    return new DashboardDtos.Kpi(key, label, BigDecimal.valueOf(value), format, detail);
  }

  private static DashboardDtos.Chart pie(String key, String title, Map<String, BigDecimal> data) {
    return shaped(key, title, "pie", data, 8);
  }

  private static DashboardDtos.Chart bar(String key, String title, Map<String, BigDecimal> data, int limit) {
    return shaped(key, title, "bar", data, limit);
  }

  private static DashboardDtos.Chart shaped(
      String key, String title, String type, Map<String, BigDecimal> data, int limit) {
    List<Map.Entry<String, BigDecimal>> sorted = data.entrySet().stream()
        .sorted(Map.Entry.<String, BigDecimal>comparingByValue(Comparator.reverseOrder()))
        .toList();
    List<String> labels = new ArrayList<>();
    List<BigDecimal> values = new ArrayList<>();
    BigDecimal others = BigDecimal.ZERO;
    for (int index = 0; index < sorted.size(); index++) {
      if (index < limit) {
        labels.add(sorted.get(index).getKey());
        values.add(sorted.get(index).getValue());
      } else {
        others = others.add(sorted.get(index).getValue());
      }
    }
    if (others.signum() > 0) {
      labels.add("Outros");
      values.add(others);
    }
    return new DashboardDtos.Chart(key, title, type, labels, List.of(new DashboardDtos.Series(title, values)));
  }

  private static DashboardDtos.Chart monthsChart(
      String key, String title, String type, List<YearMonth> months,
      Map<String, Map<YearMonth, BigDecimal>> series, List<String> order) {
    List<String> labels = months.stream()
        .map(month -> month.getMonth().getDisplayName(TextStyle.SHORT, PT) + "/" + String.valueOf(month.getYear()).substring(2))
        .toList();
    List<DashboardDtos.Series> result = order.stream()
        .map(name -> new DashboardDtos.Series(
            name, months.stream().map(month -> series.get(name).getOrDefault(month, BigDecimal.ZERO)).toList()))
        .toList();
    return new DashboardDtos.Chart(key, title, type, labels, result);
  }
}
