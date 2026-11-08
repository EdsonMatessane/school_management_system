package mz.cacoin.internalexpenses;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import mz.cacoin.internalexpenses.InternalExpenseDtos.DecisionRequest;
import mz.cacoin.internalexpenses.InternalExpenseDtos.ExpenseRequest;
import mz.cacoin.internalexpenses.InternalExpenseDtos.PaymentRequest;
import mz.cacoin.staff.StaffMember;
import mz.cacoin.staff.StaffRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class InternalExpenseServiceTest {
  private InternalExpenseRepository expenses;
  private InternalExpensePaymentRepository payments;
  private InternalExpenseCategoryRepository categories;
  private InternalExpenseSupplierRepository suppliers;
  private InternalExpenseBudgetRepository budgets;
  private InternalExpenseAuditRepository audit;
  private InternalExpenseSettingsRepository expenseSettings;
  private StaffRepository staff;
  private InternalExpenseService service;
  private InternalExpense approvedExpense;

  @BeforeEach
  void setUp() {
    expenses = mock(InternalExpenseRepository.class);
    payments = mock(InternalExpensePaymentRepository.class);
    categories = mock(InternalExpenseCategoryRepository.class);
    suppliers = mock(InternalExpenseSupplierRepository.class);
    budgets = mock(InternalExpenseBudgetRepository.class);
    audit = mock(InternalExpenseAuditRepository.class);
    expenseSettings = mock(InternalExpenseSettingsRepository.class);
    staff = mock(StaffRepository.class);
    when(expenseSettings.findById(1L)).thenReturn(Optional.of(new InternalExpenseSettings()));
    service = new InternalExpenseService(
        expenses, payments, categories, suppliers, budgets, audit, expenseSettings, staff);

    approvedExpense = new InternalExpense();
    approvedExpense.setId(8L);
    approvedExpense.setReference("DES-2026-000008");
    approvedExpense.setApprovalStatus("APPROVED");
    approvedExpense.setPaymentStatus("UNPAID");
    approvedExpense.setApprovedAmount(new BigDecimal("100.00"));
    approvedExpense.setTotalAmount(new BigDecimal("100.00"));
    when(expenses.findByIdForUpdate(8L)).thenReturn(Optional.of(approvedExpense));
    when(payments.findAllByExpenseIdOrderByCreatedAtDesc(8L)).thenReturn(List.of());
    when(expenses.save(any(InternalExpense.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    when(audit.save(any(InternalExpenseAudit.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
  }

  @Test
  void paymentCannotExceedApprovedOutstandingBalance() {
    PaymentRequest request = new PaymentRequest(
        LocalDate.of(2026, 10, 19), new BigDecimal("100.01"), "TRANSFER", null, "Tesouraria");

    ResponseStatusException error = assertThrows(
        ResponseStatusException.class, () -> service.createPayment(8L, request));

    assertEquals(409, error.getStatusCode().value());
    verify(payments, never()).saveAndFlush(any(InternalExpensePayment.class));
  }

  @Test
  void validPartialPaymentMovesExpenseToPartialPaymentState() {
    when(payments.saveAndFlush(any(InternalExpensePayment.class))).thenAnswer(invocation -> {
      InternalExpensePayment payment = invocation.getArgument(0);
      payment.setId(23L);
      return payment;
    });

    var response = service.createPayment(
        8L,
        new PaymentRequest(
            LocalDate.of(2026, 10, 19), new BigDecimal("35.00"), "TRANSFER", "TX-1", "Tesouraria"));

    assertEquals(new BigDecimal("35.00"), response.amount());
    assertEquals("PARTIAL", approvedExpense.getPaymentStatus());
  }

  @Test
  void paymentMethodMustBeConfigured() {
    ResponseStatusException error = assertThrows(
        ResponseStatusException.class,
        () -> service.createPayment(
            8L,
            new PaymentRequest(
                LocalDate.of(2026, 10, 19), new BigDecimal("10.00"), "CHEQUE", null, "Tesouraria")));

    assertEquals(400, error.getStatusCode().value());
    verify(payments, never()).saveAndFlush(any(InternalExpensePayment.class));
  }

  @Test
  void requesterMustExistInStaff() {
    when(staff.findById(99L)).thenReturn(Optional.empty());
    ExpenseRequest request = new ExpenseRequest(
        "Título", "Justificação", null, LocalDate.of(2026, 10, 19), null, null,
        new BigDecimal("10.00"), null, null, null, null, 99L, "Financeiro", null, 1L, null, null, null);

    ResponseStatusException error = assertThrows(
        ResponseStatusException.class, () -> service.create(request));

    assertEquals(400, error.getStatusCode().value());
    verify(expenses, never()).saveAndFlush(any(InternalExpense.class));
  }

  @Test
  void requesterCannotApproveOwnExpense() {
    approvedExpense.setApprovalStatus("SUBMITTED");
    approvedExpense.setRequesterId(5L);
    StaffMember requester = new StaffMember();
    requester.setId(5L);
    requester.setFirstName("Ana");
    when(staff.findById(5L)).thenReturn(Optional.of(requester));

    ResponseStatusException error = assertThrows(
        ResponseStatusException.class,
        () -> service.decide(8L, "APPROVED", new DecisionRequest("Ana", null)));

    assertEquals(403, error.getStatusCode().value());
    verify(audit, never()).save(any(InternalExpenseAudit.class));
  }
}
