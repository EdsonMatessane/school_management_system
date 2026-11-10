package mz.cacoin.teacher;

import mz.cacoin.expenses.ExpensesService;
import mz.cacoin.tasks.TaskService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import mz.cacoin.finance.SalaryPayment;
import mz.cacoin.finance.SalaryPaymentRepository;
import mz.cacoin.leaves.LeaveRequest;
import mz.cacoin.leaves.LeaveRequestRepository;
import mz.cacoin.leaves.LeaveService;
import mz.cacoin.settings.SystemDate;
import mz.cacoin.staffdocuments.StaffDocument;
import mz.cacoin.staffdocuments.StaffDocumentRepository;
import mz.cacoin.tasks.Task;
import mz.cacoin.tasks.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TeacherNotificationService {
  private static final int EXPIRING_DAYS = 30;
  private static final Pattern NUMBER = Pattern.compile("\\d+");

  public record Line(
      String id, String category, String title, String message, String tone, LocalDate date) {}

  public record Notifications(List<Line> items) {}

  private final TaskRepository tasks;
  private final LeaveRequestRepository leaves;
  private final StaffDocumentRepository documents;
  private final TaskService taskService;
  private final ExpensesService expensesService;
  private final SalaryPaymentRepository salaryPayments;

  @Transactional(readOnly = true)
  public Notifications notifications(Long staffId) {
    List<Line> items = new ArrayList<>();
    // Hora exacta quando se conhece: desempata notificações do mesmo dia (a mais recente primeiro).
    Map<String, LocalDateTime> stamps = new HashMap<>();
    LocalDate today = SystemDate.today();

    for (Task task : tasks.findAllByOrderByCreatedAtDesc()) {
      if (!staffId.equals(task.getAssigneeId()) || task.isArchived()) continue;
      LocalDate created = task.getCreatedAt() == null ? today : task.getCreatedAt().toLocalDate();
      items.add(new Line("task:" + task.getId(), "TASK", "Tarefa atribuída",
          task.getTitle(), "pending", created));
      if (task.getCreatedAt() != null) stamps.put("task:" + task.getId(), task.getCreatedAt());
      if (task.getDueAt() != null && !"DONE".equals(task.getStatus())) {
        LocalDate due = task.getDueAt().toLocalDate();
        if (due.isBefore(today)) {
          items.add(new Line("task-overdue:" + task.getId(), "TASK", "Tarefa em atraso",
              task.getTitle(), "rejected", due));
        }
      }
    }

    for (ExpensesService.ForwardNotice notice : expensesService.forwardNotices()) {
      items.add(new Line("forward:" + notice.id(), "TASK", notice.title(), notice.message(),
          "pending", notice.date()));
    }

    for (TaskService.Notice notice : taskService.commentNotices()) {
      items.add(new Line(notice.id(), notice.category(), notice.title(), notice.message(),
          notice.tone(), notice.date()));
    }

    for (LeaveRequest leave : leaves.findAllByOrderByRequestDateDescIdDesc()) {
      if (leave.getStaffMember() == null || !staffId.equals(leave.getStaffMember().getId())) continue;
      String status = leave.getStatus();
      boolean pending = LeaveService.PENDING.equals(status);
      boolean rejected = LeaveService.REJECTED.equals(status);
      items.add(new Line("leave:" + leave.getId() + ":" + status, "LEAVE",
          pending ? "Pedido de saída pendente" : rejected ? "Pedido de saída rejeitado"
              : "Pedido de saída aprovado",
          "Saída em " + format(leave.getLeaveDate()),
          pending ? "pending" : rejected ? "rejected" : "paid",
          leave.getRequestDate() == null ? today : leave.getRequestDate()));
    }

    for (StaffDocument document : documents.findAllByStaffIdOrderByIdAsc(staffId)) {
      LocalDate expiry = document.getExpiryDate();
      if (expiry == null) continue;
      String name = document.getType() == null ? "Documento" : document.getType().getName();
      if (expiry.isBefore(today)) {
        items.add(new Line("document-expired:" + document.getId(), "DOCUMENT",
            "Documento expirado", name + " — expirou em " + format(expiry), "rejected", expiry));
      } else if (!expiry.isAfter(today.plusDays(EXPIRING_DAYS))) {
        items.add(new Line("document-expiring:" + document.getId(), "DOCUMENT",
            "Documento a expirar", name + " — expira em " + format(expiry), "pending", expiry));
      }
    }

    // Salários processados: o funcionário tem de confirmar que recebeu.
    for (SalaryPayment payment : salaryPayments.findAllByStaffIdOrderByReferenceMonthAsc(staffId)) {
      String subject = switch (payment.getKind() == null ? "" : payment.getKind()) {
        case "ADVANCE" -> "Adiantamento";
        case "LIQUIDATION" -> "Liquidação de dívida";
        default -> "Salário";
      };
      YearMonth month = payment.getReferenceMonth() == null
          ? null : YearMonth.from(payment.getReferenceMonth());
      String monthText = month == null ? "—" : String.format("%02d/%04d", month.getMonthValue(), month.getYear());
      if (payment.getConfirmedAt() == null) {
        if (payment.getProcessedAt() == null) continue;
        LocalDateTime processed = LocalDateTime.ofInstant(payment.getProcessedAt(), ZoneId.systemDefault());
        String id = "salary:" + payment.getId();
        items.add(new Line(id, "SALARY", subject + " processado",
            "Referente a " + monthText + ". Confirme o recebimento na tabela de salários processados.",
            "pending", processed.toLocalDate()));
        stamps.put(id, processed);
      } else {
        LocalDateTime confirmed = LocalDateTime.ofInstant(payment.getConfirmedAt(), ZoneId.systemDefault());
        String id = "salary-confirmed:" + payment.getId();
        items.add(new Line(id, "SALARY", "Recebimento confirmado",
            subject + " de " + monthText + " confirmado em " + String.format("%02d/%02d/%04d %02d:%02d",
                confirmed.getDayOfMonth(), confirmed.getMonthValue(), confirmed.getYear(),
                confirmed.getHour(), confirmed.getMinute()),
            "paid", confirmed.toLocalDate()));
        stamps.put(id, confirmed);
      }
    }

    // A mais recente primeiro: por data, depois pela hora (quando existe) e por último pelo
    // número do registo (mais alto = criado depois).
    items.sort(Comparator.comparing(Line::date).reversed()
        .thenComparing(line -> stamps.getOrDefault(line.id(), line.date().atStartOfDay()),
            Comparator.reverseOrder())
        .thenComparing(TeacherNotificationService::sequence, Comparator.reverseOrder())
        .thenComparing(Line::id));
    return new Notifications(items);
  }

  /** Primeiro número do identificador («task:12» → 12); 0 se não tiver. */
  private static long sequence(Line line) {
    Matcher matcher = NUMBER.matcher(line.id() == null ? "" : line.id());
    if (!matcher.find()) return 0L;
    try {
      return Long.parseLong(matcher.group());
    } catch (NumberFormatException exception) {
      return 0L;
    }
  }

  private String format(LocalDate date) {
    return date == null ? "—" : String.format("%02d/%02d/%04d",
        date.getDayOfMonth(), date.getMonthValue(), date.getYear());
  }
}
