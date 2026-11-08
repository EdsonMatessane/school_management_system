package mz.cacoin.students;

import mz.cacoin.fines.FineSettingsService;
import mz.cacoin.settings.SystemDate;
import mz.cacoin.common.StudentCodes;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import mz.cacoin.common.Money;
import mz.cacoin.common.TextNormalizer;
import mz.cacoin.courses.Course;
import mz.cacoin.payments.methods.PaymentMethod;
import mz.cacoin.payments.methods.PaymentMethodRepository;
import mz.cacoin.payments.period.PaymentPeriodRules;
import mz.cacoin.payments.period.PaymentPeriodService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class StudentFeeService {
  private static final Set<String> FEE_TYPES = Set.of("ENROLLMENT", "MONTHLY", "MANUAL");

  private final StudentRepository students;
  private final StudentEnrollmentRepository enrollments;
  private final StudentFeeChargeRepository charges;
  private final StudentFeePaymentRepository payments;
  private final PaymentMethodRepository paymentMethods;
  private final PaymentPeriodService periods;
  private final FineSettingsService fines;

  private static final DateTimeFormatter PERIOD_FORMAT = DateTimeFormatter.ofPattern("MM/yyyy");

  @Transactional
  public List<StudentFeeChargeResponse> list(String feeType) {
    if (feeType == null || !FEE_TYPES.contains(feeType)) {
      throw badRequest("O tipo de cobrança é inválido");
    }
    boolean monthly = "MONTHLY".equals(feeType);
    List<StudentFeeCharge> loaded = monthly
        ? completeAllCharges().values().stream().flatMap(List::stream).toList()
        : charges.findAllByOrderByCreatedAtDescIdDesc();
    if (monthly) {
      BigDecimal percent = fines.percent();
      loaded.forEach(charge -> applyFine(charge, SystemDate.today(), percent));
    }
    Stream<StudentFeeCharge> selected = loaded.stream()
        .filter(charge -> feeType.equals(charge.getFeeType()));
    if (monthly) {
      selected = selected.sorted(Comparator
          .comparing(this::periodOf)
          .thenComparing(charge -> charge.getEnrollment().getStudent().getId()));
    }
    return selected.map(this::toResponse).toList();
  }

  /**
   * Pagamento da inscrição: por inscrição, reúne a primeira mensalidade, a taxa de
   * inscrição e o valor do manual. {@code status} pode ser PENDING, PAID ou nulo (todos).
   */
  @Transactional
  public List<StudentEnrollmentPaymentResponse> listEnrollmentPayments(String status) {
    if (status != null && !Set.of("PENDING", "PAID").contains(status)) {
      throw badRequest("O estado da inscrição é inválido");
    }
    Map<Long, List<StudentFeeCharge>> chargesByEnrollment = completeAllCharges();
    List<StudentEnrollmentPaymentResponse> result = new ArrayList<>();
    List<StudentEnrollment> allEnrollments = new ArrayList<>(
        enrollments.findAllByOrderByCreatedAtDescIdDesc());
    java.util.Collections.reverse(allEnrollments);
    for (StudentEnrollment enrollment : allEnrollments) {
      Map<String, StudentFeeCharge> items = initialCharges(
          chargesByEnrollment.getOrDefault(enrollment.getId(), List.of()));
      if (items.isEmpty()) continue;
      StudentEnrollmentPaymentResponse response = toEnrollmentPaymentResponse(enrollment, items);
      if (status == null || status.equals(response.status())) result.add(response);
    }
    return List.copyOf(result);
  }

  /** Carrega todas as cobranças e garante que cada inscrição tem o seu plano completo. */
  private Map<Long, List<StudentFeeCharge>> completeAllCharges() {
    Map<Long, List<StudentFeeCharge>> byEnrollment = new HashMap<>();
    for (StudentFeeCharge charge : charges.findAllByOrderByCreatedAtDescIdDesc()) {
      byEnrollment
          .computeIfAbsent(charge.getEnrollment().getId(), id -> new ArrayList<>())
          .add(charge);
    }
    PaymentPeriodRules rules = periods.rules();
    for (StudentEnrollment enrollment : enrollments.findAllByOrderByCreatedAtDescIdDesc()) {
      completeEnrollmentCharges(
          enrollment,
          byEnrollment.computeIfAbsent(enrollment.getId(), id -> new ArrayList<>()),
          rules);
    }
    return byEnrollment;
  }

  /** Cobranças do primeiro pagamento: primeira mensalidade, taxa de inscrição e manual. */
  private Map<String, StudentFeeCharge> initialCharges(List<StudentFeeCharge> all) {
    Map<String, StudentFeeCharge> items = new HashMap<>();
    for (StudentFeeCharge charge : all) {
      if ("MONTHLY".equals(charge.getFeeType())) {
        StudentFeeCharge current = items.get("MONTHLY");
        if (current == null || periodOf(charge).isBefore(periodOf(current))) {
          items.put("MONTHLY", charge);
        }
      } else {
        items.putIfAbsent(charge.getFeeType(), charge);
      }
    }
    return items;
  }

  /**
   * Garante que a inscrição tem as cobranças iniciais e o plano de mensalidades, do mês da
   * inscrição até ao fim da duração do curso. Inscrições antigas são completadas com os valores
   * do curso.
   */
  private void completeEnrollmentCharges(
      StudentEnrollment enrollment, List<StudentFeeCharge> existing, PaymentPeriodRules rules) {
    Course course = enrollment.getCourse();
    if (enrollment.getMonthlyFeeAmount() == null && course != null
        && course.getMonthlyFee() != null) {
      enrollment.setMonthlyFeeType(TextNormalizer.toDisplay(course.getMonthlyFee().getType()));
      enrollment.setMonthlyFeeAmount(course.getMonthlyFee().getAmount());
      enrollments.save(enrollment);
    }
    if (enrollment.getManualFeeAmount() == null && course != null
        && course.getManualFee() != null) {
      enrollment.setManualFeeType(TextNormalizer.toDisplay(course.getManualFee().getType()));
      enrollment.setManualFeeAmount(course.getManualFee().getAmount());
      enrollments.save(enrollment);
    }
    if (enrollment.getEnrollmentFeeAmount() == null && course != null
        && course.getEnrollmentFee() != null) {
      enrollment.setEnrollmentFeeType(
          TextNormalizer.toDisplay(course.getEnrollmentFee().getType()));
      enrollment.setEnrollmentFeeAmount(course.getEnrollmentFee().getAmount());
      enrollments.save(enrollment);
    }
    if (enrollment.getDurationMonths() == null && course != null) {
      enrollment.setDurationMonths(course.getDurationMonths());
      enrollments.save(enrollment);
    }
    addMissingCharge(enrollment, existing, "ENROLLMENT",
        enrollment.getEnrollmentFeeType(), enrollment.getEnrollmentFeeAmount());
    addMissingCharge(enrollment, existing, "MANUAL",
        enrollment.getManualFeeType(), enrollment.getManualFeeAmount());
    ensureMonthlySchedule(enrollment, existing, rules);
  }

  private void addMissingCharge(
      StudentEnrollment enrollment,
      List<StudentFeeCharge> existing,
      String feeType,
      String description,
      BigDecimal amount) {
    if (amount == null || amount.signum() <= 0
        || existing.stream().anyMatch(charge -> feeType.equals(charge.getFeeType()))) {
      return;
    }
    StudentFeeCharge charge = new StudentFeeCharge();
    charge.setEnrollment(enrollment);
    charge.setFeeType(feeType);
    charge.setDescription(description == null || description.isBlank()
        ? feeLabel(feeType)
        : TextNormalizer.toDisplay(description));
    charge.setAmount(amount);
    existing.add(charges.save(charge));
  }

  /**
   * Uma mensalidade por mês, a começar no mês da inscrição, durante toda a duração do curso. A
   * data limite de cada uma segue o período de pagamento configurado (Configurações > Pagamentos).
   */
  private void ensureMonthlySchedule(
      StudentEnrollment enrollment, List<StudentFeeCharge> existing, PaymentPeriodRules rules) {
    BigDecimal amount = enrollment.getMonthlyFeeAmount();
    if (amount == null || amount.signum() <= 0) return;
    LocalDate enrollmentDate = enrollmentDateOf(enrollment);
    YearMonth enrollmentMonth = YearMonth.from(enrollmentDate);
    YearMonth start = SystemDate.firstAcademicMonth(enrollmentMonth);
    int months = enrollment.getDurationMonths() == null
        ? 1
        : Math.max(1, enrollment.getDurationMonths());
    java.util.Set<String> labels = new java.util.HashSet<>();
    existing.stream()
        .filter(charge -> "MONTHLY".equals(charge.getFeeType()) && charge.getPeriodLabel() != null)
        .forEach(charge -> labels.add(charge.getPeriodLabel()));
    String firstLabel = start.format(PERIOD_FORMAT);
    // A mensalidade criada na inscrição, ainda sem período, é a do mês da inscrição.
    for (StudentFeeCharge charge : existing) {
      if ("MONTHLY".equals(charge.getFeeType()) && charge.getPeriodLabel() == null
          && !labels.contains(firstLabel)) {
        charge.setPeriodLabel(firstLabel);
        charge.setDueDate(rules.dueDateFor(start, start.equals(enrollmentMonth), enrollmentDate));
        charges.save(charge);
        labels.add(firstLabel);
      }
    }
    String description = enrollment.getMonthlyFeeType() == null
        || enrollment.getMonthlyFeeType().isBlank()
        ? feeLabel("MONTHLY")
        : TextNormalizer.toDisplay(enrollment.getMonthlyFeeType());
    YearMonth month = start;
    for (int index = 0; index < months; index++) {
      if (index > 0) {
        month = SystemDate.nextAcademicMonth(month);
      }
      String label = month.format(PERIOD_FORMAT);
      if (labels.contains(label)) continue;
      StudentFeeCharge charge = new StudentFeeCharge();
      charge.setEnrollment(enrollment);
      charge.setFeeType("MONTHLY");
      charge.setDescription(description);
      charge.setPeriodLabel(label);
      charge.setAmount(amount);
      charge.setDueDate(rules.dueDateFor(month, month.equals(enrollmentMonth), enrollmentDate));
      existing.add(charges.save(charge));
      labels.add(label);
    }
  }

  private LocalDate enrollmentDateOf(StudentEnrollment enrollment) {
    if (enrollment.getEnrollmentDate() != null) {
      return enrollment.getEnrollmentDate();
    }
    return enrollment.getCreatedAt() == null
        ? SystemDate.today()
        : enrollment.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate();
  }

  private YearMonth periodOf(StudentFeeCharge charge) {
    String label = charge.getPeriodLabel();
    if (label == null) return YearMonth.of(1970, 1);
    try {
      return YearMonth.parse(label, PERIOD_FORMAT);
    } catch (java.time.format.DateTimeParseException exception) {
      return YearMonth.of(1970, 1);
    }
  }

  private StudentEnrollmentPaymentResponse toEnrollmentPaymentResponse(
      StudentEnrollment enrollment, Map<String, StudentFeeCharge> items) {
    Student student = enrollment.getStudent();
    String studentName = Stream.of(student.getFirstName(), student.getSurname())
        .filter(value -> value != null && !value.isBlank())
        .collect(java.util.stream.Collectors.joining(" "));
    StudentEnrollmentPaymentItemResponse firstMonthly = toEnrollmentItem(items.get("MONTHLY"));
    StudentEnrollmentPaymentItemResponse enrollmentFee = toEnrollmentItem(items.get("ENROLLMENT"));
    StudentEnrollmentPaymentItemResponse manualFee = toEnrollmentItem(items.get("MANUAL"));
    BigDecimal total = BigDecimal.ZERO;
    BigDecimal paid = BigDecimal.ZERO;
    for (StudentEnrollmentPaymentItemResponse item : java.util.Arrays.asList(
        firstMonthly, enrollmentFee, manualFee)) {
      if (item == null) continue;
      total = total.add(item.amount());
      paid = paid.add(item.paidAmount());
    }
    BigDecimal balance = total.subtract(paid).max(BigDecimal.ZERO);
    return new StudentEnrollmentPaymentResponse(
        enrollment.getId(),
        student.getId(),
        StudentCodes.of(student),
        studentName,
        student.getPhone(),
        student.getEmail(),
        enrollment.getCourseName(),
        enrollment.getCategoryName(),
        enrollment.getLevelName(),
        enrollment.getModalityName(),
        enrollment.getDurationMonths(),
        enrollmentDateOf(enrollment),
        firstMonthly,
        enrollmentFee,
        manualFee,
        total,
        paid,
        balance,
        balance.signum() == 0 ? "PAID" : "PENDING");
  }

  private StudentEnrollmentPaymentItemResponse toEnrollmentItem(StudentFeeCharge charge) {
    if (charge == null) return null;
    BigDecimal paid = paidAmount(charge.getId());
    return new StudentEnrollmentPaymentItemResponse(
        charge.getId(),
        charge.getFeeType(),
        enrollmentItemLabel(charge.getFeeType()),
        charge.getDescription(),
        charge.getAmount(),
        paid,
        charge.getAmount().subtract(paid).max(BigDecimal.ZERO),
        payments.findAllByChargeIdOrderByPaymentDateDescIdDesc(charge.getId()).stream()
            .map(this::toPaymentResponse)
            .toList());
  }

  private String enrollmentItemLabel(String type) {
    return switch (type) {
      case "MONTHLY" -> "Primeira Mensalidade";
      case "MANUAL" -> "Valor do Manual";
      default -> "Taxa de Inscrição";
    };
  }

  @Transactional
  public StudentFeeChargeResponse createCharge(
      Long studentId, StudentFeeChargeRequest request) {
    if (request == null || request.feeType() == null
        || !Set.of("MONTHLY", "MANUAL").contains(request.feeType())) {
      throw badRequest("Indique um tipo de cobrança mensal ou de manual válido");
    }
    Student student = students.findById(studentId)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O estudante não foi encontrado"));
    StudentEnrollment enrollment = enrollments.findFirstByStudentIdOrderByCreatedAtDescIdDesc(studentId)
        .orElseThrow(() -> badRequest("O estudante ainda não tem uma inscrição num curso"));
    BigDecimal amount;
    String description;
    if ("MONTHLY".equals(request.feeType())) {
      if (request.periodLabel() == null
          || !request.periodLabel().matches("(0[1-9]|1[0-2])/\\d{4}")
          || request.dueDate() == null) {
        throw badRequest("Indique o mês e a data limite da mensalidade");
      }
      if (charges.existsByEnrollmentIdAndFeeTypeAndPeriodLabel(
          enrollment.getId(), "MONTHLY", request.periodLabel())) {
        throw new ResponseStatusException(
            HttpStatus.CONFLICT, "A mensalidade desse mês já foi lançada");
      }
      amount = enrollment.getMonthlyFeeAmount();
      description = enrollment.getMonthlyFeeType();
    } else {
      if (charges.existsByEnrollmentIdAndFeeType(enrollment.getId(), "MANUAL")) {
        throw new ResponseStatusException(
            HttpStatus.CONFLICT, "O valor do manual já foi lançado para esta inscrição");
      }
      amount = enrollment.getManualFeeAmount();
      description = enrollment.getManualFeeType();
    }
    requirePositiveAmount(amount);
    StudentFeeCharge charge = new StudentFeeCharge();
    charge.setEnrollment(enrollment);
    charge.setFeeType(request.feeType());
    charge.setDescription(description == null || description.isBlank()
        ? feeLabel(request.feeType())
        : TextNormalizer.toDisplay(description));
    charge.setPeriodLabel(request.periodLabel());
    charge.setAmount(amount);
    charge.setDueDate(request.dueDate());
    return toResponse(charges.save(charge));
  }

  @Transactional
  public StudentFeePaymentResponse recordPayment(
      Long chargeId, StudentFeePaymentRequest request) {
    String method = resolvePaymentMethod(
        request == null ? null : request.paymentDate(),
        request == null ? null : request.method());
    BigDecimal amount = normalizedAmount(request == null ? null : request.amount());
    StudentFeeCharge charge = charges.findByIdForUpdate(chargeId)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "A cobrança não foi encontrada"));
    applyFine(charge, request.paymentDate(), fines.percent());
    BigDecimal balance = totalDue(charge).subtract(paidAmount(chargeId));
    if (amount.compareTo(balance) > 0) {
      throw badRequest(
          "O valor pago não pode exceder o saldo em dívida (" + Money.format(balance) + ")");
    }
    return savePayment(charge, amount, request.paymentDate(), method, request.reference());
  }

  @Transactional
  public List<StudentFeePaymentResponse> recordBatchPayment(
      StudentFeeBatchPaymentRequest request) {
    if (request == null || request.payments() == null || request.payments().isEmpty()) {
      throw badRequest("Seleccione pelo menos uma cobrança para pagar");
    }
    String method = resolvePaymentMethod(request.paymentDate(), request.method());
    if (request.payments().stream().anyMatch(line -> line == null || line.chargeId() == null)
        || request.payments().stream().map(StudentFeePaymentLineRequest::chargeId).distinct().count()
            != request.payments().size()) {
      throw badRequest("A lista de cobranças seleccionadas é inválida");
    }
    java.util.ArrayList<StudentFeePaymentResponse> results = new java.util.ArrayList<>();
    Long batchStudentId = null;
    for (StudentFeePaymentLineRequest line : request.payments()) {
      BigDecimal amount = normalizedAmount(line.amount());
      StudentFeeCharge charge = charges.findByIdForUpdate(line.chargeId())
          .orElseThrow(() -> new ResponseStatusException(
              HttpStatus.NOT_FOUND, "Uma das cobranças seleccionadas não foi encontrada"));
      Long studentId = charge.getEnrollment().getStudent().getId();
      if (batchStudentId == null) {
        batchStudentId = studentId;
      } else if (!batchStudentId.equals(studentId)) {
        throw badRequest("Um pagamento conjunto só pode incluir cobranças do mesmo estudante");
      }
      applyFine(charge, request.paymentDate(), fines.percent());
      BigDecimal balance = totalDue(charge).subtract(paidAmount(charge.getId()));
      if (amount.compareTo(balance) > 0) {
        throw badRequest("Um dos valores excede o saldo em dívida");
      }
      results.add(savePayment(
          charge, amount, request.paymentDate(), method, request.reference()));
    }
    return List.copyOf(results);
  }

  /** Valida a data e devolve o nome do método de pagamento configurado (activo). */
  private String resolvePaymentMethod(LocalDate paymentDate, String paymentMethod) {
    if (paymentDate == null || paymentDate.isAfter(SystemDate.today())) {
      throw badRequest("Indique uma data de pagamento válida");
    }
    String requested = paymentMethod == null ? "" : paymentMethod.trim();
    return paymentMethods.findByNameIgnoreCase(requested)
        .filter(PaymentMethod::isActive)
        .map(PaymentMethod::getName)
        .orElseThrow(() -> badRequest("Seleccione um método de pagamento válido"));
  }

  private BigDecimal normalizedAmount(BigDecimal amount) {
    if (amount == null || amount.signum() <= 0) {
      throw badRequest("O valor pago deve ser maior que zero");
    }
    BigDecimal normalized = amount.stripTrailingZeros();
    if (normalized.scale() > 2 || normalized.precision() - normalized.scale() > 10) {
      throw badRequest("O valor pago não pode exceder duas casas decimais");
    }
    // Guardado sempre com duas casas decimais (ex.: 3000.00), como nas restantes tabelas.
    return Money.scale(amount);
  }

  private StudentFeePaymentResponse savePayment(
      StudentFeeCharge charge,
      BigDecimal amount,
      LocalDate paymentDate,
      String method,
      String reference) {
    StudentFeePayment payment = new StudentFeePayment();
    payment.setCharge(charge);
    payment.setAmount(amount);
    payment.setPaymentDate(paymentDate);
    payment.setMethod(method);
    payment.setReference(optionalText(reference));
    return toPaymentResponse(payments.save(payment));
  }

  @Transactional
  public void createEnrollmentCharges(StudentEnrollment enrollment) {
    completeEnrollmentCharges(enrollment, new ArrayList<>(), periods.rules());
  }

  /**
   * Recalcula a data limite das mensalidades com saldo em aberto segundo o período de pagamento
   * guardado. As mensalidades já pagas não são alteradas. Devolve quantas datas mudaram.
   */
  @Transactional
  public int recalculateOpenMonthlyDueDates() {
    PaymentPeriodRules rules = periods.rules();
    int updated = 0;
    for (StudentFeeCharge charge : charges.findAllByOrderByCreatedAtDescIdDesc()) {
      if (!"MONTHLY".equals(charge.getFeeType()) || charge.getPeriodLabel() == null) continue;
      YearMonth month = periodOf(charge);
      if (month.getYear() == 1970) continue;
      if (charge.getAmount().subtract(paidAmount(charge.getId())).signum() <= 0) continue;
      LocalDate enrollmentDate = enrollmentDateOf(charge.getEnrollment());
      LocalDate due = rules.dueDateFor(
          month, month.equals(YearMonth.from(enrollmentDate)), enrollmentDate);
      if (!due.equals(charge.getDueDate())) {
        charge.setDueDate(due);
        charges.save(charge);
        updated++;
      }
    }
    return updated;
  }

  private StudentFeeChargeResponse toResponse(StudentFeeCharge charge) {
    Student student = charge.getEnrollment().getStudent();
    String studentName = Stream.of(student.getFirstName(), student.getSurname())
        .filter(value -> value != null && !value.isBlank())
        .collect(java.util.stream.Collectors.joining(" "));
    BigDecimal paid = paidAmount(charge.getId());
    BigDecimal balance = totalDue(charge).subtract(paid).max(BigDecimal.ZERO);
    String status = balance.signum() == 0
        ? "PAID"
        : charge.getDueDate() != null
            && charge.getDueDate().plusDays(periods.current().getGraceDays())
                .isBefore(SystemDate.today())
            ? "OVERDUE"
            : "PENDING";
    return new StudentFeeChargeResponse(
        charge.getId(),
        student.getId(),
        StudentCodes.of(student),
        studentName,
        charge.getEnrollment().getCourseName(),
        charge.getEnrollment().getId(),
        student.getPhone(),
        student.getEmail(),
        charge.getEnrollment().getCategoryName(),
        charge.getEnrollment().getLevelName(),
        charge.getEnrollment().getModalityName(),
        charge.getEnrollment().getDurationMonths(),
        enrollmentDateOf(charge.getEnrollment()),
        charge.getFeeType(),
        charge.getDescription(),
        charge.getPeriodLabel(),
        charge.getAmount(),
        charge.getFineAmount(),
        charge.getFinePercent(),
        paid,
        balance,
        charge.getDueDate(),
        status,
        payments.findAllByChargeIdOrderByPaymentDateDescIdDesc(charge.getId()).stream()
            .map(this::toPaymentResponse)
            .toList());
  }

  /** Mensalidade mais a multa por atraso, quando já foi aplicada. */
  private BigDecimal totalDue(StudentFeeCharge charge) {
    return charge.getFineAmount() == null
        ? charge.getAmount()
        : charge.getAmount().add(charge.getFineAmount());
  }

  /**
   * Multa por atraso: percentagem da mensalidade, aplicada uma só vez quando o prazo (mais os
   * dias de tolerância) passa sem a mensalidade estar paga. Depois de fixada não volta a mudar.
   */
  private void applyFine(StudentFeeCharge charge, LocalDate asOf, BigDecimal percent) {
    if (!"MONTHLY".equals(charge.getFeeType()) || charge.getFineAmount() != null
        || charge.getDueDate() == null || percent == null || percent.signum() <= 0
        || asOf == null) {
      return;
    }
    LocalDate limit = charge.getDueDate().plusDays(periods.current().getGraceDays());
    if (!asOf.isAfter(limit) || paidAmount(charge.getId()).compareTo(charge.getAmount()) >= 0) {
      return;
    }
    charge.setFinePercent(percent);
    charge.setFineAmount(charge.getAmount()
        .multiply(percent)
        .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP));
    charges.save(charge);
  }

  private BigDecimal paidAmount(Long chargeId) {
    BigDecimal amount = payments.sumAmountByChargeId(chargeId);
    return amount == null ? BigDecimal.ZERO : amount;
  }

  private StudentFeePaymentResponse toPaymentResponse(StudentFeePayment payment) {
    return new StudentFeePaymentResponse(
        payment.getId(),
        payment.getAmount(),
        payment.getPaymentDate(),
        payment.getMethod(),
        payment.getReference());
  }

  private String feeLabel(String type) {
    return switch (type) {
      case "MONTHLY" -> "Mensalidade";
      case "MANUAL" -> "Manual";
      default -> "Taxa de Inscrição";
    };
  }

  private void requirePositiveAmount(BigDecimal amount) {
    if (amount == null || amount.signum() <= 0) {
      throw badRequest("O valor configurado para esta cobrança não é válido");
    }
  }

  private String optionalText(String value) {
    return value == null || value.isBlank() ? null : TextNormalizer.toDisplay(value.trim());
  }

  private ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
