package mz.cacoin.finance;

import mz.cacoin.teacher.TeacherContext;
import mz.cacoin.settings.SystemDate;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import mz.cacoin.common.StaffCodes;
import mz.cacoin.staff.StaffMember;
import mz.cacoin.staff.StaffRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class FinanceService {
  static final String PROCESSING = "PROCESSING";
  static final String ADVANCE = "ADVANCE";
  static final String LIQUIDATION = "LIQUIDATION";
  private static final BigDecimal MAX_AMOUNT = new BigDecimal("9999999999.99");
  private static final int MAX_DEBT_MONTHS = 120;

  private final SalaryRegistrationRepository registrations;
  private final SalaryPaymentRepository payments;
  private final FinancePositionRepository positions;
  private final FinanceSalaryTypeRepository salaryTypes;
  private final FinanceBonusTypeRepository bonusTypes;
  private final StaffRepository staff;
  private final FinanceSettingsService settings;

  // ---------- Funcionários e cadastro ----------

  @Transactional(readOnly = true)
  public List<FinanceEmployeeResponse> employees() {
    Map<Long, String> positionNames = positions.findAll().stream()
        .collect(Collectors.toMap(FinancePosition::getId, FinancePosition::getName));
    return staff.findAll().stream()
        .filter(StaffMember::isActive)
        .sorted(Comparator.comparing(StaffCodes::of))
        .map(member -> new FinanceEmployeeResponse(
            member.getId(), StaffCodes.of(member), StaffCodes.fullName(member),
            member.getPhone(), member.getBiNumber(), member.getNuit(),
            member.getPositionId(),
            member.getPositionId() == null ? null : positionNames.get(member.getPositionId())))
        .toList();
  }

  @Transactional(readOnly = true)
  public List<SalaryRegistrationResponse> listRegistrations() {
    YearMonth now = SystemDate.month();
    Map<Long, List<SalaryPayment>> byStaff = paymentsByStaff();
    return registrations.findAllByOrderByIdAsc().stream()
        .map(item -> toResponse(item, byStaff.getOrDefault(item.getStaff().getId(), List.of()), now))
        .toList();
  }

  @Transactional(readOnly = true)
  public List<SalaryRegistrationResponse> pending() {
    return listRegistrations().stream()
        .filter(item -> "PENDING".equals(item.status()))
        .toList();
  }

  @Transactional
  public SalaryRegistrationResponse createRegistration(SalaryRegistrationRequest request) {
    if (request == null || request.staffId() == null) {
      throw badRequest("Indique o código do funcionário");
    }
    StaffMember member = staff.findById(request.staffId())
        .filter(StaffMember::isActive)
        .orElseThrow(() -> badRequest("O funcionário não existe ou está inativo"));
    if (registrations.existsByStaffId(member.getId())) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "O funcionário já tem cadastro de salário");
    }
    SalaryRegistration registration = new SalaryRegistration();
    registration.setStaff(member);
    applyRegistration(registration, request);
    return toResponse(registrations.save(registration), List.of(), SystemDate.month());
  }

  @Transactional
  public SalaryRegistrationResponse updateRegistration(Long id, SalaryRegistrationRequest request) {
    SalaryRegistration registration = registrations.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O cadastro de salário não foi encontrado"));
    applyRegistration(registration, request);
    SalaryRegistration saved = registrations.save(registration);
    return toResponse(saved,
        payments.findAllByStaffIdOrderByReferenceMonthAsc(saved.getStaff().getId()),
        SystemDate.month());
  }

  @Transactional
  public void deleteRegistration(Long id) {
    SalaryRegistration registration = registrations.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O cadastro de salário não foi encontrado"));
    if (payments.existsByStaffId(registration.getStaff().getId())) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Não é possível apagar um cadastro com pagamentos registados");
    }
    registrations.delete(registration);
  }

  // ---------- Pagamentos ----------

  @Transactional(readOnly = true)
  public List<SalaryPaymentResponse> listPayments(String kind) {
    YearMonth now = SystemDate.month();
    Map<Long, SalaryRegistration> byStaff = registrations.findAllByOrderByIdAsc().stream()
        .collect(Collectors.toMap(item -> item.getStaff().getId(), Function.identity()));
    return payments.findAllByOrderByReferenceMonthDescIdDesc().stream()
        .filter(item -> kind == null || kind.isBlank() || item.getKind().equalsIgnoreCase(kind))
        .map(item -> toResponse(item, byStaff.get(item.getStaff().getId()), now))
        .toList();
  }

  @Transactional
  public SalaryPaymentResponse process(SalaryPaymentRequest request) {
    settings.requireProcessingPeriodOpen();
    return pay(request, SystemDate.month(), PROCESSING);
  }

  @Transactional
  public SalaryPaymentResponse advance(SalaryPaymentRequest request) {
    if (request == null || request.month() == null) {
      throw badRequest("Indique o mês de adiantamento");
    }
    YearMonth month = YearMonth.from(request.month());
    YearMonth now = SystemDate.month();
    int max = settings.maxAdvanceMonths();
    if (max <= 0) {
      throw badRequest("Os adiantamentos não estão permitidos pelas definições");
    }
    if (!month.isAfter(now) || month.isAfter(now.plusMonths(max))) {
      throw badRequest("O mês de adiantamento deve estar entre o próximo mês e " + max + " mês(es) à frente");
    }
    return pay(request, month, ADVANCE);
  }

  @Transactional
  public SalaryPaymentResponse liquidate(SalaryPaymentRequest request) {
    if (request == null || request.month() == null) {
      throw badRequest("Indique o mês de dívida");
    }
    YearMonth month = YearMonth.from(request.month());
    if (!month.isBefore(SystemDate.month())) {
      throw badRequest("Só é possível liquidar meses anteriores ao mês actual");
    }
    return pay(request, month, LIQUIDATION);
  }

  /** O próprio funcionário confirma que recebeu o pagamento. */
  @Transactional
  public SalaryPaymentResponse confirmReceipt(Long id) {
    if (!TeacherContext.active()) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "Só o próprio funcionário pode confirmar o recebimento");
    }
    SalaryPayment payment = payments.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O pagamento não foi encontrado"));
    TeacherContext.requireSelf(payment.getStaff().getId());
    if (payment.getConfirmedAt() != null) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "O recebimento já foi confirmado");
    }
    payment.setConfirmedAt(Instant.now());
    payment.setConfirmedById(payment.getStaff().getId());
    SalaryPayment saved = payments.save(payment);
    return toResponse(saved,
        registrations.findByStaffId(saved.getStaff().getId()).orElse(null), SystemDate.month());
  }

  private SalaryPaymentResponse pay(SalaryPaymentRequest request, YearMonth month, String kind) {
    if (request == null || request.staffId() == null) {
      throw badRequest("Indique o código do funcionário");
    }
    SalaryRegistration registration = registrations.findByStaffId(request.staffId())
        .orElseThrow(() -> badRequest("O funcionário não tem cadastro de salário"));
    LocalDate first = month.atDay(1);
    SalaryPayment existing = payments
        .findByStaffIdAndReferenceMonth(request.staffId(), first).orElse(null);
    String rule = settings.paymentRule();
    String observation = text(request.observation());
    YearMonth now = SystemDate.month();
    if (existing != null) {
      if (ADVANCE.equals(kind) || existing.getDiscountedBalance().signum() <= 0) {
        throw new ResponseStatusException(
            HttpStatus.CONFLICT, "O salário deste mês já foi processado");
      }
      BigDecimal paidNow = resolvePaid(rule, request.amount(), existing.getDiscountedBalance());
      existing.setPaidAmount(existing.getPaidAmount().add(paidNow));
      existing.setDiscountedBalance(existing.getDiscountedBalance().subtract(paidNow));
      existing.setLiquidatedAt(Instant.now());
      if (observation != null) existing.setObservation(observation);
      return toResponse(payments.save(existing), registration, now);
    }
    BigDecimal salary = registration.getSalary();
    BigDecimal paid = resolvePaid(rule, request.amount(), salary);
    SalaryPayment payment = new SalaryPayment();
    payment.setStaff(registration.getStaff());
    payment.setReferenceMonth(first);
    payment.setKind(kind);
    payment.setSalaryAmount(salary);
    payment.setPaidAmount(paid);
    payment.setBonusAmount(registration.getBonusType() == null
        ? BigDecimal.ZERO : registration.getBonus());
    payment.setDiscountedBalance(salary.subtract(paid));
    payment.setObservation(observation);
    return toResponse(payments.save(payment), registration, now);
  }

  // ---------- Dívidas ----------

  @Transactional(readOnly = true)
  public List<SalaryDebtResponse> debts() {
    YearMonth now = SystemDate.month();
    Map<Long, List<SalaryPayment>> byStaff = paymentsByStaff();
    List<SalaryDebtResponse> result = new ArrayList<>();
    for (SalaryRegistration registration : registrations.findAllByOrderByIdAsc()) {
      List<SalaryDebtMonthResponse> months = debtMonths(
          registration, byStaff.getOrDefault(registration.getStaff().getId(), List.of()), now);
      if (months.isEmpty()) continue;
      StaffMember member = registration.getStaff();
      result.add(new SalaryDebtResponse(
          member.getId(), StaffCodes.of(member), StaffCodes.fullName(member),
          member.getPhone(), member.getBiNumber(), member.getNuit(),
          registration.getPosition().getName(), registration.getSalaryType().getName(),
          registration.getSalary(),
          registration.getBonusType() == null ? null : registration.getBonusType().getName(),
          registration.getBonus(),
          months.stream().map(SalaryDebtMonthResponse::owed).reduce(BigDecimal.ZERO, BigDecimal::add),
          months));
    }
    return result;
  }

  // ---------- Dashboard e relatórios ----------

  @Transactional(readOnly = true)
  public FinanceDashboardResponse dashboard() {
    YearMonth now = SystemDate.month();
    List<SalaryRegistration> regs = registrations.findAllByOrderByIdAsc();
    Map<Long, List<SalaryPayment>> byStaff = paymentsByStaff();
    if (TeacherContext.active()) {
      regs = regs.stream().filter(item -> TeacherContext.isSelf(item.getStaff().getId())).toList();
      byStaff.keySet().removeIf(id -> !TeacherContext.isSelf(id));
    }
    int paid = 0;
    int bonused = 0;
    int pending = 0;
    BigDecimal payroll = BigDecimal.ZERO;
    for (SalaryRegistration reg : regs) {
      payroll = payroll.add(reg.getSalary());
      String status = currentStatus(byStaff.getOrDefault(reg.getStaff().getId(), List.of()), now);
      switch (status) {
        case "BONUSED" -> bonused++;
        case "PENDING" -> pending++;
        default -> paid++;
      }
    }
    int advancedMonths = 0;
    BigDecimal paidThisMonth = BigDecimal.ZERO;
    BigDecimal bonusThisMonth = BigDecimal.ZERO;
    BigDecimal paidThisYear = BigDecimal.ZERO;
    for (List<SalaryPayment> list : byStaff.values()) {
      for (SalaryPayment payment : list) {
        YearMonth month = YearMonth.from(payment.getReferenceMonth());
        if (ADVANCE.equals(payment.getKind()) && month.isAfter(now)) advancedMonths++;
        if (month.equals(now)) {
          paidThisMonth = paidThisMonth.add(payment.getPaidAmount());
          bonusThisMonth = bonusThisMonth.add(payment.getBonusAmount());
        }
        if (month.getYear() == now.getYear()) {
          paidThisYear = paidThisYear.add(payment.getPaidAmount()).add(payment.getBonusAmount());
        }
      }
    }
    List<SalaryDebtResponse> debts = debts();
    if (TeacherContext.active()) {
      debts = debts.stream().filter(item -> TeacherContext.isSelf(item.staffId())).toList();
    }
    return new FinanceDashboardResponse(
        regs.size(), payroll, paid, bonused, pending, advancedMonths,
        paidThisMonth, bonusThisMonth, paidThisYear, debts.size(),
        debts.stream().map(SalaryDebtResponse::totalOwed).reduce(BigDecimal.ZERO, BigDecimal::add));
  }

  @Transactional(readOnly = true)
  public List<FinanceReportRowResponse> report(Integer year, Long staffId) {
    int reportYear = year == null ? SystemDate.month().getYear() : year;
    YearMonth now = SystemDate.month();
    Map<Long, List<SalaryPayment>> byStaff = paymentsByStaff();
    List<FinanceReportRowResponse> rows = new ArrayList<>();
    for (SalaryRegistration registration : registrations.findAllByOrderByIdAsc()) {
      StaffMember member = registration.getStaff();
      if (staffId != null && !member.getId().equals(staffId)) continue;
      Map<LocalDate, SalaryPayment> byMonth = byStaff.getOrDefault(member.getId(), List.of())
          .stream().collect(Collectors.toMap(
              SalaryPayment::getReferenceMonth, Function.identity(), (left, right) -> left));
      YearMonth start = YearMonth.from(registrationDate(registration));
      YearMonth first = start.isAfter(YearMonth.of(reportYear, 1)) ? start : YearMonth.of(reportYear, 1);
      for (YearMonth month = first; !month.isAfter(YearMonth.of(reportYear, 12)); month = month.plusMonths(1)) {
        SalaryPayment payment = byMonth.get(month.atDay(1));
        if (payment == null && month.isAfter(now)) continue;
        rows.add(reportRow(registration, member, month, payment, now));
      }
    }
    return rows;
  }

  // ---------- Regras partilhadas ----------

  static String status(SalaryPayment payment, YearMonth now) {
    YearMonth month = YearMonth.from(payment.getReferenceMonth());
    if (ADVANCE.equals(payment.getKind()) && month.isAfter(now)) return "ADVANCED";
    if (payment.getDiscountedBalance().signum() > 0) return "PENDING";
    if (payment.getBonusAmount().signum() > 0) return "BONUSED";
    return "PAID";
  }

  static BigDecimal resolvePaid(String rule, BigDecimal requested, BigDecimal max) {
    if (FinanceSettingsService.FULL.equals(rule)) {
      return max;
    }
    if (requested == null || requested.signum() <= 0 || requested.scale() > 2
        || requested.compareTo(MAX_AMOUNT) > 0) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Indique o valor a pagar, superior a zero e com no máximo duas casas decimais");
    }
    if (requested.compareTo(max) > 0) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "O valor a pagar não pode ser superior ao salário em falta");
    }
    return requested;
  }

  private String currentStatus(List<SalaryPayment> payments, YearMonth now) {
    return payments.stream()
        .filter(item -> YearMonth.from(item.getReferenceMonth()).equals(now))
        .findFirst()
        .map(item -> status(item, now))
        .orElse("PENDING");
  }

  private List<SalaryDebtMonthResponse> debtMonths(
      SalaryRegistration registration, List<SalaryPayment> history, YearMonth now) {
    Map<LocalDate, SalaryPayment> byMonth = history.stream().collect(Collectors.toMap(
        SalaryPayment::getReferenceMonth, Function.identity(), (left, right) -> left));
    List<SalaryDebtMonthResponse> months = new ArrayList<>();
    YearMonth month = YearMonth.from(registrationDate(registration));
    int guard = 0;
    while (month.isBefore(now) && guard++ < MAX_DEBT_MONTHS) {
      SalaryPayment payment = byMonth.get(month.atDay(1));
      BigDecimal owed = payment == null ? registration.getSalary() : payment.getDiscountedBalance();
      if (owed.signum() > 0) {
        months.add(new SalaryDebtMonthResponse(month.atDay(1), owed, payment != null));
      }
      month = month.plusMonths(1);
    }
    return months;
  }

  private void applyRegistration(SalaryRegistration registration, SalaryRegistrationRequest request) {
    if (request == null || request.positionId() == null || request.salaryTypeId() == null) {
      throw badRequest("Indique o cargo, o tipo de salário e o salário");
    }
    FinancePosition position = positions.findById(request.positionId())
        .orElseThrow(() -> badRequest("O cargo selecionado não existe"));
    StaffMember owner = registration.getStaff();
    if (owner != null && owner.getPositionId() != null
        && !owner.getPositionId().equals(position.getId())) {
      throw badRequest("O cargo deve ser o cargo do funcionário");
    }
    String bankName = request.bankName() == null ? "" : request.bankName().trim();
    if (bankName.isEmpty()) {
      throw badRequest("Indique o banco");
    }
    if (bankName.length() > 120) {
      throw badRequest("O nome do banco pode ter até 120 caracteres");
    }
    String nibError = Nib.validate(request.nib());
    if (nibError != null) {
      throw badRequest(nibError);
    }
    FinanceSalaryType salaryType = salaryTypes.findById(request.salaryTypeId())
        .orElseThrow(() -> badRequest("O tipo de salário selecionado não existe"));
    BigDecimal salary = request.salary() == null ? salaryType.getAmount() : request.salary();
    validateAmount(salary, "O salário");
    FinanceBonusType bonusType = null;
    BigDecimal bonus = BigDecimal.ZERO;
    if (request.bonusTypeId() != null) {
      bonusType = bonusTypes.findById(request.bonusTypeId())
          .orElseThrow(() -> badRequest("O tipo de bónus selecionado não existe"));
      bonus = request.bonus() == null ? bonusType.getAmount() : request.bonus();
      validateAmount(bonus, "O bónus");
    }
    registration.setPosition(position);
    registration.setSalaryType(salaryType);
    registration.setSalary(salary);
    registration.setBonusType(bonusType);
    registration.setBonus(bonus);
    registration.setObservation(text(request.observation()));
    registration.setBankName(bankName);
    registration.setNib(Nib.clean(request.nib()));
  }

  private void validateAmount(BigDecimal amount, String label) {
    if (amount == null || amount.signum() <= 0 || amount.scale() > 2
        || amount.compareTo(MAX_AMOUNT) > 0) {
      throw badRequest(label + " deve ser superior a zero, com no máximo duas casas decimais");
    }
  }

  private String text(String value) {
    String trimmed = value == null ? "" : value.trim();
    if (trimmed.length() > 500) {
      throw badRequest("A observação não pode ter mais de 500 caracteres");
    }
    return trimmed.isEmpty() ? null : trimmed;
  }

  private Map<Long, List<SalaryPayment>> paymentsByStaff() {
    Map<Long, List<SalaryPayment>> map = new HashMap<>();
    for (SalaryPayment payment : payments.findAllByOrderByReferenceMonthDescIdDesc()) {
      map.computeIfAbsent(payment.getStaff().getId(), id -> new ArrayList<>()).add(payment);
    }
    return map;
  }

  private LocalDate registrationDate(SalaryRegistration registration) {
    return registration.getCreatedAt() == null
        ? SystemDate.today()
        : registration.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate();
  }

  private SalaryRegistrationResponse toResponse(
      SalaryRegistration registration, List<SalaryPayment> history, YearMonth now) {
    StaffMember member = registration.getStaff();
    LocalDate last = history.stream()
        .map(SalaryPayment::getProcessedAt)
        .max(Comparator.naturalOrder())
        .map(instant -> instant.atZone(ZoneId.systemDefault()).toLocalDate())
        .orElse(null);
    return new SalaryRegistrationResponse(
        registration.getId(),
        member.getId(),
        StaffCodes.of(member),
        StaffCodes.fullName(member),
        member.getPhone(),
        member.getBiNumber(),
        member.getNuit(),
        registration.getPosition().getId(),
        registration.getPosition().getName(),
        registration.getSalaryType().getId(),
        registration.getSalaryType().getName(),
        registration.getSalary(),
        registration.getBonusType() == null ? null : registration.getBonusType().getId(),
        registration.getBonusType() == null ? null : registration.getBonusType().getName(),
        registration.getBonus(),
        registrationDate(registration),
        registration.getObservation(),
        currentStatus(history, now),
        last,
        registration.getBankName(),
        Nib.account(registration.getNib()),
        registration.getNib());
  }

  private SalaryPaymentResponse toResponse(
      SalaryPayment payment, SalaryRegistration registration, YearMonth now) {
    StaffMember member = payment.getStaff();
    return new SalaryPaymentResponse(
        payment.getId(),
        member.getId(),
        StaffCodes.of(member),
        StaffCodes.fullName(member),
        member.getPhone(),
        member.getBiNumber(),
        member.getNuit(),
        registration == null ? null : registration.getPosition().getName(),
        registration == null ? null : registration.getSalaryType().getName(),
        registration == null || registration.getBonusType() == null
            ? null : registration.getBonusType().getName(),
        payment.getReferenceMonth(),
        payment.getKind(),
        status(payment, now),
        payment.getSalaryAmount(),
        payment.getPaidAmount(),
        payment.getBonusAmount(),
        payment.getDiscountedBalance(),
        payment.getObservation(),
        LocalDateTime.ofInstant(payment.getProcessedAt(), ZoneId.systemDefault()),
        registration == null ? null : registration.getBankName(),
        registration == null ? null : Nib.account(registration.getNib()),
        registration == null ? null : registration.getNib(),
        payment.getConfirmedAt() == null
            ? null : LocalDateTime.ofInstant(payment.getConfirmedAt(), ZoneId.systemDefault()),
        payment.getConfirmedAt() == null ? null : StaffCodes.fullName(member));
  }

  private FinanceReportRowResponse reportRow(
      SalaryRegistration registration, StaffMember member, YearMonth month,
      SalaryPayment payment, YearMonth now) {
    boolean missing = payment == null;
    String status = missing ? (month.equals(now) ? "PENDING" : "DEBT") : status(payment, now);
    return new FinanceReportRowResponse(
        member.getId(),
        StaffCodes.of(member),
        StaffCodes.fullName(member),
        member.getPhone(),
        member.getBiNumber(),
        member.getNuit(),
        registration.getPosition().getName(),
        registration.getSalaryType().getName(),
        month.atDay(1),
        status,
        missing ? null : payment.getKind(),
        missing ? registration.getSalary() : payment.getSalaryAmount(),
        missing ? BigDecimal.ZERO : payment.getPaidAmount(),
        missing ? BigDecimal.ZERO : payment.getBonusAmount(),
        missing ? registration.getSalary() : payment.getDiscountedBalance(),
        missing ? registration.getSalary() : payment.getDiscountedBalance(),
        missing ? null : LocalDateTime.ofInstant(payment.getProcessedAt(), ZoneId.systemDefault()),
        missing ? null : payment.getObservation());
  }

  private ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
