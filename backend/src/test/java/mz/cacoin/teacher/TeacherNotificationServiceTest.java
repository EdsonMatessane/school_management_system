package mz.cacoin.teacher;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import mz.cacoin.expenses.ExpensesService;
import mz.cacoin.finance.SalaryPayment;
import mz.cacoin.finance.SalaryPaymentRepository;
import mz.cacoin.leaves.LeaveRequestRepository;
import mz.cacoin.settings.SystemDate;
import mz.cacoin.staffdocuments.StaffDocumentRepository;
import mz.cacoin.tasks.Task;
import mz.cacoin.tasks.TaskRepository;
import mz.cacoin.tasks.TaskService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TeacherNotificationServiceTest {
  private TaskRepository tasks;
  private SalaryPaymentRepository salaryPayments;
  private TeacherNotificationService service;

  @BeforeEach
  void setUp() {
    tasks = mock(TaskRepository.class);
    salaryPayments = mock(SalaryPaymentRepository.class);
    service = new TeacherNotificationService(
        tasks,
        mock(LeaveRequestRepository.class),
        mock(StaffDocumentRepository.class),
        mock(TaskService.class),
        mock(ExpensesService.class),
        salaryPayments);
  }

  private Task task(long id, LocalDateTime createdAt) {
    Task task = new Task();
    task.setId(id);
    task.setAssigneeId(5L);
    task.setTitle("Tarefa " + id);
    task.setCreatedAt(createdAt);
    return task;
  }

  private SalaryPayment payment(long id, Instant processedAt, Instant confirmedAt) {
    SalaryPayment payment = new SalaryPayment();
    payment.setId(id);
    payment.setKind("PROCESSING");
    payment.setReferenceMonth(LocalDate.of(2026, 11, 1));
    payment.setSalaryAmount(new BigDecimal("12000.00"));
    payment.setPaidAmount(new BigDecimal("12000.00"));
    payment.setProcessedAt(processedAt);
    payment.setConfirmedAt(confirmedAt);
    return payment;
  }

  @Test
  void theLatestNotificationOfTheSameDayComesFirst() {
    LocalDate today = SystemDate.today();
    // O número do registo mais alto foi criado mais cedo: a hora é que decide.
    when(tasks.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(
        task(12, today.atTime(8, 0)), task(3, today.atTime(9, 30))));

    List<TeacherNotificationService.Line> items = service.notifications(5L).items();

    assertEquals("task:3", items.get(0).id());
    assertEquals("task:12", items.get(1).id());
  }

  @Test
  void whenOnlyTheDayIsKnownTheHigherRecordNumberComesFirst() {
    LocalDate today = SystemDate.today();
    when(tasks.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(
        task(2, today.atStartOfDay()), task(10, today.atStartOfDay())));

    List<TeacherNotificationService.Line> items = service.notifications(5L).items();

    assertEquals("task:10", items.get(0).id());
    assertEquals("task:2", items.get(1).id());
  }

  @Test
  void aProcessedSalaryNotifiesTheEmployeeUntilHeConfirms() {
    Instant processed = Instant.now();
    when(salaryPayments.findAllByStaffIdOrderByReferenceMonthAsc(5L))
        .thenReturn(List.of(payment(7, processed, null)));

    TeacherNotificationService.Line pending = service.notifications(5L).items().get(0);
    assertEquals("salary:7", pending.id());
    assertEquals("SALARY", pending.category());
    assertEquals("Salário processado", pending.title());
    assertEquals("pending", pending.tone());

    when(salaryPayments.findAllByStaffIdOrderByReferenceMonthAsc(5L))
        .thenReturn(List.of(payment(7, processed, processed.plusSeconds(60))));

    TeacherNotificationService.Line confirmed = service.notifications(5L).items().get(0);
    assertEquals("salary-confirmed:7", confirmed.id());
    assertEquals("Recebimento confirmado", confirmed.title());
    assertEquals("paid", confirmed.tone());
    LocalDateTime when = LocalDateTime.ofInstant(processed.plusSeconds(60), ZoneId.systemDefault());
    assertEquals(when.toLocalDate(), confirmed.date());
  }
}
