package mz.cacoin.portal;

import mz.cacoin.assessments.AssessmentGradeRepository;
import mz.cacoin.assessments.AssessmentGrade;
import mz.cacoin.assessments.AssessmentComponents;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import mz.cacoin.attendances.AttendanceNotification;
import mz.cacoin.attendances.AttendanceNotificationRepository;
import mz.cacoin.attendances.AttendanceRecordResponse;
import mz.cacoin.attendances.AttendanceService;
import mz.cacoin.attendances.AttendanceSettingsService;
import mz.cacoin.common.StudentCodes;
import mz.cacoin.common.RichText;
import mz.cacoin.common.TextNormalizer;
import mz.cacoin.courses.Course;
import mz.cacoin.dashboard.DashboardDtos;
import mz.cacoin.exams.ExamRegistrationService;
import mz.cacoin.graduations.GraduationRegistrationService;
import mz.cacoin.mobilemoney.MobileMoneyDtos;
import mz.cacoin.mobilemoney.MobileMoneyPayables;
import mz.cacoin.mobilemoney.MobileMoneyService;
import mz.cacoin.modules.Module;
import mz.cacoin.modules.ModuleRepository;
import mz.cacoin.modules.disciplines.Discipline;
import mz.cacoin.modules.disciplines.DisciplineRepository;
import mz.cacoin.onlineclasses.OnlineLesson;
import mz.cacoin.onlineclasses.OnlineLessonRepository;
import mz.cacoin.onlineclasses.OnlineMaterial;
import mz.cacoin.onlineclasses.OnlineMaterialRepository;
import mz.cacoin.pautas.PautaService;
import mz.cacoin.notifications.NotificationMessage;
import mz.cacoin.notifications.NotificationMessageRepository;
import mz.cacoin.requests.StudentRequestDtos;
import mz.cacoin.requests.StudentRequestService;
import mz.cacoin.requests.StudentRequestSettingsService;
import mz.cacoin.settings.SystemDate;
import mz.cacoin.staff.StaffCourseAssignment;
import mz.cacoin.staff.StaffCourseAssignmentRepository;
import mz.cacoin.staff.StaffMember;
import mz.cacoin.students.Student;
import mz.cacoin.students.StudentEnrollment;
import mz.cacoin.students.StudentEnrollmentRepository;
import mz.cacoin.students.StudentFeeChargeResponse;
import mz.cacoin.students.StudentFeeService;
import mz.cacoin.students.StudentRepository;
import mz.cacoin.students.exams.StudentExamGrade;
import mz.cacoin.students.exams.StudentExamGradeRepository;
import mz.cacoin.students.tests.StudentTestGrade;
import mz.cacoin.students.tests.StudentTestGradeRepository;
import mz.cacoin.suspensions.SuspensionRegistrationService;
import mz.cacoin.tests.TestRegistrationService;
import mz.cacoin.uniforms.UniformOrderService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class PortalService {
  private static final Locale PT = Locale.forLanguageTag("pt-MZ");
  private static final Map<String, String> FEE_TYPES =
      Map.of("MONTHLY", "Mensalidade", "ENROLLMENT", "Inscrição", "MANUAL", "Manual");

  private final StudentRepository students;
  private final StudentEnrollmentRepository enrollments;
  private final StudentFeeService fees;
  private final StudentExamGradeRepository examGrades;
  private final StudentTestGradeRepository testGrades;
  private final AssessmentGradeRepository assessmentGrades;
  private final ExamRegistrationService examRegistrations;
  private final TestRegistrationService testRegistrations;
  private final PautaService pautas;
  private final AttendanceService attendances;
  private final AttendanceSettingsService attendanceSettings;
  private final AttendanceNotificationRepository attendanceNotifications;
  private final StudentRequestService requests;
  private final StudentRequestSettingsService requestSettings;
  private final NotificationMessageRepository notificationMessages;
  private final UniformOrderService uniforms;
  private final GraduationRegistrationService graduations;
  private final SuspensionRegistrationService suspensions;
  private final MobileMoneyPayables payables;
  private final MobileMoneyService mobileMoney;
  private final ModuleRepository modules;
  private final DisciplineRepository disciplines;
  private final OnlineLessonRepository onlineLessons;
  private final OnlineMaterialRepository onlineMaterials;
  private final StaffCourseAssignmentRepository staffAssignments;

  @Transactional
  public PortalDtos.Profile profile(Long studentId) {
    Student student = student(studentId);
    StudentEnrollment enrollment = enrollments
        .findFirstByStudentIdOrderByCreatedAtDescIdDesc(studentId).orElse(null);
    LocalDate enrollmentDate = enrollment == null ? null
        : enrollment.getEnrollmentDate() != null ? enrollment.getEnrollmentDate()
        : enrollment.getCreatedAt() == null ? null
        : enrollment.getCreatedAt().atZone(java.time.ZoneId.systemDefault()).toLocalDate();
    return new PortalDtos.Profile(
        StudentCodes.of(student),
        name(student),
        student.getPhone(),
        student.getEmail(),
        student.getBiNumber(),
        enrollment == null ? null : enrollment.getCourseName(),
        enrollment == null ? null : enrollment.getCategoryName(),
        enrollment == null ? null : enrollment.getLevelName(),
        enrollment == null ? null : enrollment.getModalityName(),
        enrollmentDate,
        enrollment == null ? null : student.isActive() ? "Ativo" : "Inativo");
  }

  @Transactional
  public PortalDtos.Payments payments(Long studentId) {
    Student student = student(studentId);
    LocalDate today = SystemDate.today();
    List<StudentFeeChargeResponse> own = ownCharges(studentId);
    List<PortalDtos.Charge> charges = own.stream()
        .sorted(Comparator.comparing(StudentFeeChargeResponse::dueDate,
            Comparator.nullsLast(Comparator.naturalOrder())))
        .map(charge -> new PortalDtos.Charge(
            charge.id(),
            charge.description(),
            charge.periodLabel(),
            FEE_TYPES.getOrDefault(charge.feeType(), charge.feeType()),
            charge.dueDate(),
            money(charge.amount()),
            money(charge.paidAmount()),
            money(charge.balance()),
            charge.status(),
            money(charge.balance()).signum() > 0
                && charge.dueDate() != null && charge.dueDate().isBefore(today)))
        .toList();
    BigDecimal billed = sum(charges, PortalDtos.Charge::amount);
    BigDecimal paid = sum(charges, PortalDtos.Charge::paidAmount);
    BigDecimal balance = sum(charges, PortalDtos.Charge::balance);
    BigDecimal overdue = charges.stream().filter(PortalDtos.Charge::overdue)
        .map(PortalDtos.Charge::balance).reduce(BigDecimal.ZERO, BigDecimal::add);
    List<PortalDtos.PaymentLine> history = own.stream()
        .flatMap(charge -> charge.payments().stream().map(payment -> new PortalDtos.PaymentLine(
            payment.paymentDate(),
            charge.periodLabel() == null || charge.periodLabel().isBlank()
                ? charge.description() : charge.description() + " — " + charge.periodLabel(),
            payment.amount(),
            payment.method(),
            payment.reference())))
        .sorted(Comparator.comparing(PortalDtos.PaymentLine::date,
            Comparator.nullsLast(Comparator.reverseOrder())))
        .toList();
    List<MobileMoneyDtos.PayableGroup> pending = payables.forCode(StudentCodes.of(student)).groups();
    List<MobileMoneyDtos.TransactionResponse> mobile = mobileMoney.list().stream()
        .filter(item -> studentId.equals(item.studentId())).toList();
    return new PortalDtos.Payments(billed, paid, balance, overdue, charges, history, pending, mobile);
  }

  @Transactional
  public PortalDtos.Academics academics(Long studentId) {
    Student student = student(studentId);
    String code = StudentCodes.of(student);
    List<AssessmentGrade> registered =
        assessmentGrades.findAllByStudentIdOrderBySheetAcademicYearDescIdAsc(studentId);
    List<PortalDtos.GradeLine> tests = Stream.concat(
        testGrades.findAllByStudentIdWithTest(studentId).stream().map(this::line),
        registered.stream()
            .filter(item -> !item.getComponent().startsWith("E"))
            .map(this::line)).toList();
    List<PortalDtos.GradeLine> exams = Stream.concat(
        examGrades.findAllByStudentIdWithExam(studentId).stream().map(this::line),
        registered.stream()
            .filter(item -> item.getComponent().startsWith("E"))
            .map(this::line)).toList();
    return new PortalDtos.Academics(
        tests,
        exams,
        pautas.list(null, null).stream().filter(row -> code.equalsIgnoreCase(row.studentCode())).toList(),
        testRegistrations.list(null).stream().filter(row -> code.equalsIgnoreCase(row.studentCode())).toList(),
        examRegistrations.list(null).stream().filter(row -> code.equalsIgnoreCase(row.studentCode())).toList());
  }

  @Transactional(readOnly = true)
  public PortalDtos.Attendance attendance(Long studentId) {
    List<AttendanceRecordResponse> records = ownAttendance(studentId);
    long absent = records.stream().filter(item -> "ABSENT".equals(item.status())).count();
    long justified = records.stream()
        .filter(item -> "ABSENT".equals(item.status()) && "JUSTIFIED".equals(item.justification()))
        .count();
    long unjustified = absent - justified;
    long present = records.size() - absent;
    BigDecimal rate = records.isEmpty() ? BigDecimal.ZERO
        : BigDecimal.valueOf(present * 100.0 / records.size()).setScale(1, RoundingMode.HALF_UP);
    Integer maxAbsences = attendanceSettings.maxAbsences();
    boolean exceeded = maxAbsences != null && unjustified > maxAbsences;
    return new PortalDtos.Attendance(
        records.size(), present, absent, justified, unjustified, rate,
        maxAbsences,
        exceeded,
        exceeded ? RichText.toPlainText(attendanceSettings.notificationMessage(), false) : null,
        attendanceSettings.justificationFee(),
        records);
  }

  @Transactional(readOnly = true)
  public PortalDtos.Requests requestsOf(Long studentId) {
    return new PortalDtos.Requests(requests.list().stream()
        .filter(item -> studentId.equals(item.studentId())).toList());
  }

  @Transactional(readOnly = true)
  public PortalDtos.Services services(Long studentId) {
    String code = StudentCodes.of(student(studentId));
    return new PortalDtos.Services(
        uniforms.list().stream().filter(row -> code.equalsIgnoreCase(row.studentCode())).toList(),
        graduations.list().stream().filter(row -> code.equalsIgnoreCase(row.studentCode())).toList(),
        suspensions.list().stream().filter(row -> code.equalsIgnoreCase(row.studentCode())).toList());
  }

  @Transactional
  public PortalDtos.Overview overview(Long studentId) {
    PortalDtos.Profile profile = profile(studentId);
    PortalDtos.Payments payments = payments(studentId);
    PortalDtos.Attendance attendance = attendance(studentId);
    PortalDtos.Academics academics = academics(studentId);
    LocalDate today = SystemDate.today();
    YearMonth current = YearMonth.from(today);
    PortalDtos.Charge next = payments.charges().stream()
        .filter(charge -> charge.balance().signum() > 0)
        .min(Comparator.comparing(PortalDtos.Charge::dueDate, Comparator.nullsLast(Comparator.naturalOrder())))
        .orElse(null);
    BigDecimal paidYear = payments.history().stream()
        .filter(line -> line.date() != null && line.date().getYear() == today.getYear())
        .map(PortalDtos.PaymentLine::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
    List<PortalDtos.GradeLine> graded = Stream.concat(academics.tests().stream(), academics.exams().stream())
        .filter(line -> !line.absent() && line.grade() != null && line.maxGrade() != null
            && line.maxGrade().signum() > 0)
        .toList();
    BigDecimal average = graded.isEmpty() ? BigDecimal.ZERO : graded.stream()
        .map(line -> line.grade().multiply(BigDecimal.valueOf(100))
            .divide(line.maxGrade(), 4, RoundingMode.HALF_UP))
        .reduce(BigDecimal.ZERO, BigDecimal::add)
        .divide(BigDecimal.valueOf(graded.size()), 1, RoundingMode.HALF_UP);
    long pendingRequests = requestsOf(studentId).items().stream()
        .filter(item -> "PENDING".equals(item.status())).count();
    int pendingCount = payments.pending().stream().mapToInt(group -> group.items().size()).sum();

    List<DashboardDtos.Kpi> kpis = List.of(
        new DashboardDtos.Kpi("balance", "Em dívida", payments.balance(), "money",
            pendingCount + " pagamento(s) por fazer"),
        new DashboardDtos.Kpi("paidYear", "Pago no ano", paidYear, "money", "Ano " + today.getYear()),
        new DashboardDtos.Kpi("attendance", "Presenças", attendance.rate(), "percent",
            attendance.unjustified() + " falta(s) injustificada(s)"
                + (attendance.maxAbsences() == null ? "" : " · limite " + attendance.maxAbsences())),
        new DashboardDtos.Kpi("average", "Média das avaliações", average, "percent",
            graded.size() + " avaliação(ões)"),
        new DashboardDtos.Kpi("requests", "Pedidos pendentes", BigDecimal.valueOf(pendingRequests),
            "number", null));

    List<YearMonth> months = new ArrayList<>();
    for (int offset = 11; offset >= 0; offset--) months.add(current.minusMonths(offset));
    Map<YearMonth, BigDecimal> byMonth = new HashMap<>();
    payments.history().stream().filter(line -> line.date() != null)
        .forEach(line -> byMonth.merge(YearMonth.from(line.date()), line.amount(), BigDecimal::add));
    List<String> labels = months.stream().map(month -> month.getMonth()
        .getDisplayName(TextStyle.SHORT, PT) + "/" + String.valueOf(month.getYear()).substring(2)).toList();
    DashboardDtos.Chart paymentsChart = new DashboardDtos.Chart(
        "payments", "Pagamentos por mês", "line", labels,
        List.of(new DashboardDtos.Series("Pagamentos",
            months.stream().map(month -> byMonth.getOrDefault(month, BigDecimal.ZERO)).toList())));
    Map<String, BigDecimal> presence = new LinkedHashMap<>();
    presence.put("Presenças", BigDecimal.valueOf(attendance.present()));
    presence.put("Faltas", BigDecimal.valueOf(attendance.absent()));
    DashboardDtos.Chart attendanceChart = new DashboardDtos.Chart(
        "attendance", "Presenças", "pie", new ArrayList<>(presence.keySet()),
        List.of(new DashboardDtos.Series("Presenças", new ArrayList<>(presence.values()))));
    List<PortalDtos.GradeLine> lastGraded = graded.stream().limit(8).toList();
    DashboardDtos.Chart gradesChart = new DashboardDtos.Chart(
        "grades", "Avaliações (%)", "bar",
        lastGraded.stream().map(PortalDtos.GradeLine::name).toList(),
        List.of(new DashboardDtos.Series("Avaliações", lastGraded.stream()
            .map(line -> line.grade().multiply(BigDecimal.valueOf(100))
                .divide(line.maxGrade(), 1, RoundingMode.HALF_UP)).toList())));

    return new PortalDtos.Overview(
        profile,
        kpis,
        List.of(paymentsChart, attendanceChart, gradesChart),
        payments.billed(),
        payments.paid(),
        payments.balance(),
        next == null ? null : next.dueDate(),
        next == null ? null : next.balance(),
        payments.history().stream().limit(5).toList(),
        attendance.records().stream().limit(5).toList());
  }

  private List<StudentFeeChargeResponse> ownCharges(Long studentId) {
    return Stream.of("ENROLLMENT", "MANUAL", "MONTHLY")
        .flatMap(type -> fees.list(type).stream())
        .filter(charge -> studentId.equals(charge.studentId()))
        .toList();
  }

  private List<AttendanceRecordResponse> ownAttendance(Long studentId) {
    return attendances.list().stream()
        .filter(item -> studentId.equals(item.studentId()))
        .sorted(Comparator.comparing(AttendanceRecordResponse::date,
            Comparator.nullsLast(Comparator.reverseOrder())))
        .toList();
  }

  /** Nota lançada no Registo de Notas (testes, trabalho e exames da pauta). */
  private PortalDtos.GradeLine line(AssessmentGrade grade) {
    var sheet = grade.getSheet();
    return new PortalDtos.GradeLine(
        AssessmentComponents.label(grade.getComponent()),
        sheet.getCourse().getName() + " " + sheet.getAcademicYear(),
        grade.getGrade(),
        BigDecimal.valueOf(20),
        grade.isAbsent(),
        true,
        null);
  }

  private PortalDtos.GradeLine line(StudentTestGrade grade) {
    var test = grade.getTest();
    String unit = test.getModule() != null ? test.getModule().getName()
        : test.getDiscipline() != null ? test.getDiscipline().getName() : null;
    return new PortalDtos.GradeLine(test.getName(), unit, grade.getGrade(), test.getMaxGrade(),
        grade.isAbsent(), test.isCompleted(), grade.getObservations());
  }

  private PortalDtos.GradeLine line(StudentExamGrade grade) {
    var exam = grade.getExam();
    String unit = exam.getModule() != null ? exam.getModule().getName()
        : exam.getDiscipline() != null ? exam.getDiscipline().getName() : null;
    return new PortalDtos.GradeLine(exam.getName(), unit, grade.getGrade(), exam.getMaxGrade(),
        grade.isAbsent(), exam.isCompleted(), grade.getObservations());
  }

  @Transactional(readOnly = true)
  public PortalDtos.CourseOverview course(Long studentId) {
    StudentEnrollment enrollment = lastEnrollment(studentId);
    if (enrollment == null || enrollment.getCourse() == null) {
      return new PortalDtos.CourseOverview(null, null, null, List.of(), List.of(), List.of());
    }
    Course course = enrollment.getCourse();
    Integer duration = enrollment.getDurationMonths() != null
        ? enrollment.getDurationMonths() : course.getDurationMonths();
    List<PortalDtos.CourseModule> courseModules = modules
        .findAllByCourseIdAndActiveTrueOrderByModuleNumberAsc(course.getId()).stream()
        .map(module -> new PortalDtos.CourseModule(
            module.getId(), module.getModuleNumber(), TextNormalizer.toDisplay(module.getName())))
        .toList();
    List<PortalDtos.CourseDiscipline> courseDisciplines = disciplines
        .findAllByCourseIdOrderByDisciplineNumberAsc(course.getId()).stream()
        .filter(Discipline::isActive)
        .map(discipline -> new PortalDtos.CourseDiscipline(
            discipline.getId(), discipline.getDisciplineNumber(),
            TextNormalizer.toDisplay(discipline.getName())))
        .toList();
    return new PortalDtos.CourseOverview(
        course.getId(),
        TextNormalizer.toDisplay(course.getName()),
        duration,
        courseModules,
        courseDisciplines,
        courseTeachers(course.getId()));
  }

  /** Nomes dos professores activos associados ao curso (apenas nomes, sem outros dados). */
  private List<String> courseTeachers(Long courseId) {
    return staffAssignments.findAllByCourseIdAndActiveTrue(courseId).stream()
        .map(StaffCourseAssignment::getStaffMember)
        .filter(StaffMember::isActive)
        .filter(member -> "teachers".equals(member.getStaffType()))
        .map(member -> Stream.of(member.getFirstName(), member.getSurname())
            .filter(value -> value != null && !value.isBlank()).map(String::trim)
            .collect(Collectors.joining(" ")))
        .filter(value -> !value.isEmpty())
        .distinct()
        .sorted(String.CASE_INSENSITIVE_ORDER)
        .toList();
  }

  @Transactional(readOnly = true)
  public PortalDtos.ModuleDetail moduleDetail(Long studentId, Long moduleId) {
    StudentEnrollment enrollment = lastEnrollment(studentId);
    Module module = modules.findById(moduleId)
        .filter(Module::isActive)
        .filter(item -> enrollment != null && enrollment.getCourse() != null
            && item.getCourse().getId().equals(enrollment.getCourse().getId()))
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O módulo não foi encontrado"));
    return new PortalDtos.ModuleDetail(
        module.getId(),
        module.getModuleNumber(),
        TextNormalizer.toDisplay(module.getName()),
        TextNormalizer.toDisplay(module.getCourse().getName()),
        module.getDetails());
  }

  @Transactional(readOnly = true)
  public PortalDtos.OnlineClasses onlineClasses(Long studentId) {
    StudentEnrollment enrollment = lastEnrollment(studentId);
    if (enrollment == null || enrollment.getCourse() == null) {
      return new PortalDtos.OnlineClasses(null, List.of());
    }
    Course course = enrollment.getCourse();
    List<OnlineLesson> lessons = onlineLessons.findAllByCourseIdOrderByStartAtAsc(course.getId());
    Map<Long, List<PortalDtos.OnlineMaterialLine>> materialsByLesson = lessons.isEmpty()
        ? Map.of()
        : onlineMaterials.findAllByLessonIdIn(lessons.stream().map(OnlineLesson::getId).toList())
            .stream()
            .sorted(Comparator.comparing(OnlineMaterial::getCreatedAt,
                Comparator.nullsLast(Comparator.naturalOrder())))
            .collect(Collectors.groupingBy(OnlineMaterial::getLessonId,
                Collectors.mapping(material -> new PortalDtos.OnlineMaterialLine(
                    material.getId(), material.getTitle(), material.getType(),
                    material.getUrl(), material.getDescription()), Collectors.toList())));
    return new PortalDtos.OnlineClasses(
        TextNormalizer.toDisplay(course.getName()),
        lessons.stream()
            .map(lesson -> new PortalDtos.OnlineLessonLine(
                lesson.getId(),
                lesson.getTitle(),
                lesson.getDescription(),
                lesson.getStartAt(),
                lesson.getEndAt(),
                lesson.getPlatform(),
                lesson.getMeetingUrl(),
                lesson.getMeetingPassword(),
                lesson.getRecurrence(),
                materialsByLesson.getOrDefault(lesson.getId(), List.of())))
            .toList());
  }

  @Transactional(readOnly = true)
  public List<StudentRequestDtos.TypeResponse> requestTypes() {
    return requestSettings.listTypes();
  }

  @Transactional
  public StudentRequestDtos.Response createRequest(
      Long studentId, StudentRequestDtos.Request request, List<MultipartFile> files) {
    StudentEnrollment enrollment = lastEnrollment(studentId);
    if (enrollment == null || enrollment.getCourse() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Não tem nenhum curso inscrito");
    }
    return requests.create(
        new StudentRequestDtos.Request(
            studentId,
            enrollment.getCourse().getId(),
            request == null ? null : request.typeId(),
            request == null ? null : request.description()),
        files);
  }

  public StudentRequestService.AttachmentFile requestAttachment(Long studentId, Long attachmentId) {
    return requests.getAttachment(attachmentId, studentId);
  }

  @Transactional
  public PortalDtos.Notifications notifications(Long studentId) {
    List<NotificationEntry> entries = new ArrayList<>();

    PortalDtos.Profile profile = profile(studentId);
    if (profile.courseName() != null && profile.enrollmentDate() != null) {
      addNotification(entries, "enrollment:" + studentId, "ENROLLMENT", "Inscrição registada",
          joinParts(profile.courseName(), profile.levelName(), profile.modalityName()),
          "paid", atStartOfDay(profile.enrollmentDate()));
    }

    PortalDtos.Payments payments = payments(studentId);
    for (PortalDtos.PaymentLine payment : payments.history()) {
      if (payment.date() == null) {
        continue;
      }
      addNotification(entries,
          "payment:" + Math.abs(Objects.hash(
              payment.reference(), payment.description(), payment.date(), payment.amount())),
          "PAYMENT", "Pagamento recebido",
          joinParts(payment.description(), moneyText(payment.amount()), payment.method()),
          "paid", atStartOfDay(payment.date()));
    }
    for (PortalDtos.Charge charge : payments.charges()) {
      if (!charge.overdue() || charge.dueDate() == null) {
        continue;
      }
      addNotification(entries, "overdue:" + charge.id(), "PAYMENT", "Pagamento em atraso",
          joinParts(charge.description(), charge.periodLabel(),
              "em dívida " + moneyText(charge.balance())),
          "rejected", atStartOfDay(charge.dueDate()));
    }
    for (MobileMoneyDtos.TransactionResponse item : payments.mobileMoney()) {
      Instant at = item.completedAt() != null ? item.completedAt() : item.createdAt();
      addNotification(entries, "mobile:" + item.id() + ":" + item.status(), "PAYMENT",
          "Pagamento móvel — " + item.statusLabel(),
          joinParts(item.description(), moneyText(item.amount()), item.walletLabel()),
          item.statusTone(), at);
    }

    Set<String> requestMessages = new java.util.HashSet<>();
    var requestDefaults = requestSettings.currentSettings();
    for (StudentRequestDtos.Response request : requestsOf(studentId).items()) {
      String configured = switch (request.status()) {
        case "APPROVED" -> requestDefaults.getApproveMessage();
        case "REJECTED" -> requestDefaults.getRejectMessage();
        case "COMPLETED" -> requestDefaults.getCompleteMessage();
        default -> null;
      };
      String statusMessage = RichText.toPlainText(
          request.statusMessage() != null ? request.statusMessage() : configured, false).trim();
      if (!statusMessage.isEmpty()) {
        requestMessages.add(statusMessage);
      }
      addNotification(entries, "request:" + request.id() + ":" + request.status(), "REQUEST",
          "Pedido " + request.requestNumber() + " — " + request.statusLabel(),
          joinParts(request.typeName(), statusMessage,
              "REJECTED".equals(request.status()) && request.notes() != null
                  ? "Motivo: " + request.notes() : null),
          request.statusTone(),
          request.statusAt() != null ? request.statusAt() : atStartOfDay(request.requestDate()));
    }

    PortalDtos.Academics academics = academics(studentId);
    for (var registration : academics.testRegistrations()) {
      addNotification(entries, "test-registration:" + registration.id(), "ACADEMIC",
          "Inscrição em teste",
          joinParts(registration.testType(), feeText(registration.amount())),
          "neutral", atStartOfDay(registration.registrationDate()));
    }
    for (var registration : academics.examRegistrations()) {
      addNotification(entries, "exam-registration:" + registration.id(), "ACADEMIC",
          "Inscrição em exame",
          joinParts(registration.examType(), feeText(registration.amount())),
          "neutral", atStartOfDay(registration.registrationDate()));
    }

    ownAttendance(studentId).stream()
        .filter(row -> "ABSENT".equals(row.status()))
        .limit(30)
        .forEach(row -> addNotification(entries,
            "attendance:" + row.id() + ":" + row.justification(),
            "ATTENDANCE",
            switch (String.valueOf(row.justification())) {
              case "JUSTIFIED" -> "Falta justificada";
              case "PAYMENT_PENDING" -> "Justificação por pagar";
              default -> "Falta registada";
            },
            joinParts(row.courseName(), row.teacherName()),
            "JUSTIFIED".equals(row.justification()) || "PAYMENT_PENDING".equals(row.justification())
                ? "pending" : "rejected",
            atStartOfDay(row.date())));

    PortalDtos.Attendance attendance = attendance(studentId);
    List<AttendanceNotification> excessNotices =
        attendanceNotifications.findAllByStudentIdInOrderByIdDesc(List.of(studentId));
    for (AttendanceNotification notice : excessNotices) {
      addNotification(entries, "absence-excess:" + notice.getId(), "ATTENDANCE",
          "Excesso de faltas",
          joinParts(RichText.toPlainText(notice.getMessage(), false), notice.getAbsences() + " faltas"),
          "rejected", notice.getCreatedAt());
    }
    if (attendance.exceeded() && excessNotices.isEmpty()) {
      Instant lastAbsence = attendance.records().stream()
          .filter(row -> "ABSENT".equals(row.status()))
          .map(AttendanceRecordResponse::date)
          .filter(Objects::nonNull)
          .max(Comparator.naturalOrder())
          .map(PortalService::atStartOfDay)
          .orElse(Instant.now());
      addNotification(entries, "absence-excess:live", "ATTENDANCE", "Excesso de faltas",
          joinParts(attendance.warning(),
              attendance.unjustified() + " faltas injustificadas (limite " + attendance.maxAbsences() + ")"),
          "rejected", lastAbsence);
    }

    PortalDtos.Services services = services(studentId);
    for (var order : services.uniforms()) {
      LocalDate date = order.delivered() && order.deliveryDate() != null
          ? order.deliveryDate() : order.orderDate();
      addNotification(entries, "uniform:" + order.id() + ":" + order.delivered(), "SERVICE",
          order.delivered() ? "Farda entregue" : "Pedido de farda registado",
          joinParts(order.size(), moneyText(order.amount()), order.paid() ? "pago" : "por pagar"),
          order.delivered() ? "paid" : "pending", atStartOfDay(date));
    }
    for (var registration : services.graduations()) {
      LocalDate date = registration.graduated() && registration.graduationDate() != null
          ? registration.graduationDate() : registration.registrationDate();
      addNotification(entries,
          "graduation:" + registration.id() + ":" + registration.graduated(), "SERVICE",
          registration.graduated() ? "Graduação concluída" : "Inscrição na graduação",
          joinParts(registration.courseName(), moneyText(registration.amount())),
          registration.graduated() ? "paid" : "pending", atStartOfDay(date));
    }
    for (var registration : services.suspensions()) {
      addNotification(entries,
          "suspension:" + registration.id() + ":" + registration.suspended(), "SERVICE",
          registration.suspended() ? "Suspensão registada" : "Pedido de suspensão",
          joinParts(registration.courseName(), moneyText(registration.amount())),
          registration.suspended() ? "rejected" : "pending",
          atStartOfDay(registration.suspensionDate()));
    }

    for (NotificationMessage message
        : notificationMessages.findAllByStudentIdOrderByCreatedAtDescIdDesc(studentId)) {
      if (!"SENT".equals(message.getStatus())) {
        continue;
      }
      String plain = RichText.toPlainText(message.getMessage(), false).trim();
      if (requestMessages.contains(plain)) {
        continue;
      }
      addNotification(entries, "message:" + message.getId(), "MESSAGE",
          "WHATSAPP".equals(message.getChannel()) ? "Mensagem por WhatsApp" : "Mensagem por SMS",
          plain, "neutral", message.getCreatedAt());
    }

    return new PortalDtos.Notifications(entries.stream()
        .sorted(Comparator.comparing(NotificationEntry::at).reversed())
        .limit(150)
        .map(NotificationEntry::line)
        .toList());
  }

  private record NotificationEntry(Instant at, PortalDtos.NotificationLine line) {}

  private static void addNotification(
      List<NotificationEntry> entries, String id, String category, String title,
      String message, String tone, Instant at) {
    if (at == null) {
      return;
    }
    entries.add(new NotificationEntry(at, new PortalDtos.NotificationLine(
        id, category, title, message, tone,
        at.atZone(java.time.ZoneId.systemDefault()).toLocalDate())));
  }

  private static Instant atStartOfDay(LocalDate date) {
    return date == null ? null : date.atStartOfDay(java.time.ZoneId.systemDefault()).toInstant();
  }

  private static String feeText(java.math.BigDecimal amount) {
    return amount != null && amount.signum() <= 0 ? "Sem taxa de cobrança" : moneyText(amount);
  }

  private static String moneyText(BigDecimal amount) {
    return amount == null ? null : String.format(PT, "%,.2f MZN", amount);
  }

  private static String joinParts(String... parts) {
    return Stream.of(parts)
        .filter(part -> part != null && !part.isBlank())
        .map(String::trim)
        .collect(Collectors.joining(" · "));
  }

  private StudentEnrollment lastEnrollment(Long studentId) {
    student(studentId);
    return enrollments.findFirstByStudentIdOrderByCreatedAtDescIdDesc(studentId).orElse(null);
  }

  private Student student(Long id) {
    return students.findById(id).orElseThrow(() -> new ResponseStatusException(
        HttpStatus.NOT_FOUND, "O estudante não foi encontrado"));
  }

  private static String name(Student student) {
    return Stream.of(student.getFirstName(), student.getSurname())
        .filter(value -> value != null && !value.isBlank()).map(String::trim)
        .collect(Collectors.joining(" "));
  }

  private static BigDecimal money(BigDecimal value) {
    return Objects.requireNonNullElse(value, BigDecimal.ZERO);
  }

  private static <T> BigDecimal sum(List<T> items, java.util.function.Function<T, BigDecimal> getter) {
    return items.stream().map(getter).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
  }
}
