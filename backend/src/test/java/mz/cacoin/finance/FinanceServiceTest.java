package mz.cacoin.finance;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import mz.cacoin.staff.StaffMember;
import mz.cacoin.staff.StaffRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class FinanceServiceTest {
  private SalaryRegistrationRepository registrations;
  private SalaryPaymentRepository payments;
  private FinancePositionRepository positions;
  private FinanceSalaryTypeRepository salaryTypes;
  private FinanceBonusTypeRepository bonusTypes;
  private StaffRepository staff;
  private FinanceSettingsService settings;
  private FinanceService service;
  private StaffMember member;
  private SalaryRegistration registration;
  private final YearMonth now = YearMonth.now();

  @BeforeEach
  void setUp() {
    registrations = mock(SalaryRegistrationRepository.class);
    payments = mock(SalaryPaymentRepository.class);
    positions = mock(FinancePositionRepository.class);
    salaryTypes = mock(FinanceSalaryTypeRepository.class);
    bonusTypes = mock(FinanceBonusTypeRepository.class);
    staff = mock(StaffRepository.class);
    settings = mock(FinanceSettingsService.class);
    service = new FinanceService(
        registrations, payments, positions, salaryTypes, bonusTypes, staff, settings);

    member = new StaffMember();
    member.setId(5L);
    member.setStaffType("other");
    member.setStaffNumber(3);
    member.setFirstName("Marta");
    member.setSurname("Cossa");
    member.setBiNumber("110100123456B");
    member.setNuit("400123456");
    member.setPhone("841234567");
    FinancePosition position = new FinancePosition();
    position.setId(1L);
    position.setName("Secretária");
    FinanceSalaryType type = new FinanceSalaryType();
    type.setId(1L);
    type.setName("Mensal");
    type.setAmount(new BigDecimal("12000.00"));
    registration = new SalaryRegistration();
    registration.setId(1L);
    registration.setStaff(member);
    registration.setPosition(position);
    registration.setSalaryType(type);
    registration.setSalary(new BigDecimal("12000.00"));
    registration.setCreatedAt(now.minusMonths(3).atDay(10)
        .atStartOfDay(ZoneId.systemDefault()).toInstant());

    when(staff.findById(5L)).thenReturn(Optional.of(member));
    when(registrations.findByStaffId(5L)).thenReturn(Optional.of(registration));
    when(registrations.findAllByOrderByIdAsc()).thenReturn(List.of(registration));
    when(positions.findById(1L)).thenReturn(Optional.of(position));
    when(salaryTypes.findById(1L)).thenReturn(Optional.of(type));
    when(settings.paymentRule()).thenReturn("FULL");
    when(settings.maxAdvanceMonths()).thenReturn(2);
    // Como a base de dados: ao gravar, o pagamento ganha a data de processamento (@PrePersist).
    when(payments.save(any(SalaryPayment.class))).thenAnswer(invocation -> {
      SalaryPayment saved = invocation.getArgument(0);
      if (saved.getProcessedAt() == null) {
        saved.setProcessedAt(Instant.now());
      }
      return saved;
    });
    when(registrations.save(any(SalaryRegistration.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    when(payments.findAllByOrderByReferenceMonthDescIdDesc()).thenReturn(List.of());
  }

  private SalaryPayment payment(YearMonth month, String kind, String paid, String bonus, String discounted) {
    SalaryPayment payment = new SalaryPayment();
    payment.setStaff(member);
    payment.setReferenceMonth(month.atDay(1));
    payment.setKind(kind);
    payment.setSalaryAmount(new BigDecimal("12000.00"));
    payment.setPaidAmount(new BigDecimal(paid));
    payment.setBonusAmount(new BigDecimal(bonus));
    payment.setDiscountedBalance(new BigDecimal(discounted));
    payment.setProcessedAt(Instant.now());
    return payment;
  }

  @Test
  void fullRulePaysTheWholeSalaryAndIgnoresTheAmountSent() {
    SalaryPaymentResponse response = service.process(
        new SalaryPaymentRequest(5L, null, new BigDecimal("1.00"), null));

    assertEquals(new BigDecimal("12000.00"), response.paidAmount());
    assertEquals(0, response.discountedBalance().signum());
    assertEquals("PAID", response.status());
    assertEquals(now.atDay(1), response.month());
    assertEquals("STAFF0003", response.staffCode());
    verify(settings).requireProcessingPeriodOpen();
  }

  @Test
  void partialRuleAcceptsLessThanTheSalaryAndKeepsTheRestAsDiscountedBalance() {
    when(settings.paymentRule()).thenReturn("PARTIAL");

    SalaryPaymentResponse response = service.process(
        new SalaryPaymentRequest(5L, null, new BigDecimal("8000.00"), "Parcial"));

    assertEquals(new BigDecimal("8000.00"), response.paidAmount());
    assertEquals(new BigDecimal("4000.00"), response.discountedBalance());
    assertEquals("PENDING", response.status());
    assertEquals("Parcial", response.observation());
  }

  @Test
  void partialRuleRejectsMissingZeroOrAboveSalaryAmounts() {
    when(settings.paymentRule()).thenReturn("PARTIAL");
    for (BigDecimal amount : new BigDecimal[] {
        null, BigDecimal.ZERO, new BigDecimal("12000.01"), new BigDecimal("10.555")}) {
      assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.process(
          new SalaryPaymentRequest(5L, null, amount, null))).getStatusCode().value());
    }
    verify(payments, never()).save(any(SalaryPayment.class));
  }

  @Test
  void bonusIsPaidTogetherWhenTheRegistrationHasOne() {
    FinanceBonusType bonusType = new FinanceBonusType();
    bonusType.setId(2L);
    bonusType.setName("Assiduidade");
    registration.setBonusType(bonusType);
    registration.setBonus(new BigDecimal("500.00"));

    SalaryPaymentResponse response = service.process(
        new SalaryPaymentRequest(5L, null, null, null));

    assertEquals(new BigDecimal("500.00"), response.bonus());
    assertEquals("BONUSED", response.status());
    assertEquals("Assiduidade", response.bonusTypeName());
  }

  @Test
  void processingRespectsThePeriodAndRejectsAlreadyProcessedMonths() {
    when(payments.findByStaffIdAndReferenceMonth(5L, now.atDay(1)))
        .thenReturn(Optional.of(payment(now, "PROCESSING", "12000.00", "0", "0")));
    assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.process(
        new SalaryPaymentRequest(5L, null, null, null))).getStatusCode().value());

    doThrow(new ResponseStatusException(HttpStatus.CONFLICT, "fechado"))
        .when(settings).requireProcessingPeriodOpen();
    assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.process(
        new SalaryPaymentRequest(5L, null, null, null))).getStatusCode().value());
  }

  @Test
  void processingAPartiallyPaidMonthCompletesTheRemainingBalance() {
    when(settings.paymentRule()).thenReturn("PARTIAL");
    SalaryPayment partial = payment(now, "PROCESSING", "8000.00", "0", "4000.00");
    when(payments.findByStaffIdAndReferenceMonth(5L, now.atDay(1))).thenReturn(Optional.of(partial));

    SalaryPaymentResponse response = service.process(
        new SalaryPaymentRequest(5L, null, new BigDecimal("4000.00"), null));

    assertEquals(new BigDecimal("12000.00"), response.paidAmount());
    assertEquals(0, response.discountedBalance().signum());
    assertEquals("PAID", response.status());
  }

  @Test
  void advanceOnlyFitsBetweenNextMonthAndTheConfiguredLimit() {
    LocalDate next = now.plusMonths(1).atDay(15);
    LocalDate tooFar = now.plusMonths(3).atDay(1);

    SalaryPaymentResponse response = service.advance(new SalaryPaymentRequest(5L, next, null, null));

    assertEquals("ADVANCE", response.kind());
    assertEquals("ADVANCED", response.status());
    assertEquals(now.plusMonths(1).atDay(1), response.month());
    assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.advance(
        new SalaryPaymentRequest(5L, tooFar, null, null))).getStatusCode().value());
    assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.advance(
        new SalaryPaymentRequest(5L, now.atDay(1), null, null))).getStatusCode().value());
    when(settings.maxAdvanceMonths()).thenReturn(0);
    assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.advance(
        new SalaryPaymentRequest(5L, next, null, null))).getStatusCode().value());
  }

  @Test
  void anAdvancedMonthThatHasArrivedCountsAsPaidAutomatically() {
    SalaryPayment advance = payment(now, "ADVANCE", "12000.00", "0", "0");
    SalaryPayment future = payment(now.plusMonths(1), "ADVANCE", "12000.00", "0", "0");

    assertEquals("PAID", FinanceService.status(advance, now));
    assertEquals("ADVANCED", FinanceService.status(future, now));
    assertEquals("BONUSED", FinanceService.status(
        payment(now, "PROCESSING", "12000.00", "500.00", "0"), now));
    assertEquals("PENDING", FinanceService.status(
        payment(now, "PROCESSING", "1000.00", "0", "11000.00"), now));
  }

  @Test
  void debtsListTheUnpaidPastMonthsAndTheResidualOfPartialOnes() {
    // cadastro há 3 meses: meses em dívida possíveis = -3, -2, -1
    SalaryPayment settled = payment(now.minusMonths(3), "PROCESSING", "12000.00", "0", "0");
    SalaryPayment partial = payment(now.minusMonths(1), "PROCESSING", "8000.00", "0", "4000.00");
    when(payments.findAllByOrderByReferenceMonthDescIdDesc()).thenReturn(List.of(partial, settled));

    List<SalaryDebtResponse> debts = service.debts();

    assertEquals(1, debts.size());
    List<SalaryDebtMonthResponse> months = debts.get(0).months();
    assertEquals(2, months.size());
    assertEquals(now.minusMonths(2).atDay(1), months.get(0).month());
    assertEquals(new BigDecimal("12000.00"), months.get(0).owed());
    assertEquals(new BigDecimal("4000.00"), months.get(1).owed());
    assertTrue(months.get(1).partial());
    assertEquals(new BigDecimal("16000.00"), debts.get(0).totalOwed());
  }

  @Test
  void liquidatingCreatesTheMissingMonthAndOnlyAcceptsPastMonths() {
    LocalDate past = now.minusMonths(2).atDay(1);

    SalaryPaymentResponse response = service.liquidate(new SalaryPaymentRequest(5L, past, null, null));

    assertEquals("LIQUIDATION", response.kind());
    assertEquals(past, response.month());
    assertEquals("PAID", response.status());
    assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.liquidate(
        new SalaryPaymentRequest(5L, now.atDay(1), null, null))).getStatusCode().value());
  }

  @Test
  void pendingListsOnlyWhoDoesNotHaveTheCurrentMonthSettled() {
    assertEquals(1, service.pending().size());

    when(payments.findAllByOrderByReferenceMonthDescIdDesc())
        .thenReturn(List.of(payment(now, "PROCESSING", "12000.00", "0", "0")));
    assertTrue(service.pending().isEmpty());
  }

  @Test
  void registrationUsesTheTypeSalaryByDefaultAndRejectsDuplicates() {
    SalaryRegistrationRequest request =
        new SalaryRegistrationRequest(5L, 1L, 1L, null, null, null, " nota ");

    SalaryRegistrationResponse created = service.createRegistration(request);

    assertEquals(new BigDecimal("12000.00"), created.salary());
    assertEquals("nota", created.observation());
    assertEquals("PENDING", created.status());
    assertEquals(0, created.bonus().signum());

    when(registrations.existsByStaffId(5L)).thenReturn(true);
    assertEquals(409, assertThrows(ResponseStatusException.class,
        () -> service.createRegistration(request)).getStatusCode().value());
  }

  @Test
  void deletingARegistrationWithPaymentsIsRejected() {
    when(registrations.findById(1L)).thenReturn(Optional.of(registration));
    when(payments.existsByStaffId(5L)).thenReturn(true);

    assertEquals(409, assertThrows(ResponseStatusException.class,
        () -> service.deleteRegistration(1L)).getStatusCode().value());
    verify(registrations, never()).delete(any(SalaryRegistration.class));
  }

  @Test
  void reportListsPaidMonthsAndTheDebtOrPendingOnes() {
    int year = now.getYear();
    SalaryPayment paid = payment(YearMonth.of(year, now.getMonthValue()), "PROCESSING", "12000.00", "0", "0");
    when(payments.findAllByOrderByReferenceMonthDescIdDesc()).thenReturn(List.of(paid));

    List<FinanceReportRowResponse> rows = service.report(year, 5L);

    assertTrue(rows.stream().anyMatch(row -> row.status().equals("PAID")));
    assertTrue(rows.stream().noneMatch(row -> row.month().isAfter(now.atEndOfMonth())));
    assertTrue(rows.stream().allMatch(row -> row.staffCode().equals("STAFF0003")));
  }
}
