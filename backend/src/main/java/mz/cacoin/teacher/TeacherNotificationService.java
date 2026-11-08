package mz.cacoin.teacher;

import mz.cacoin.expenses.ExpensesService;
import mz.cacoin.tasks.TaskService;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
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

  public record Line(
      String id, String category, String title, String message, String tone, LocalDate date) {}

  public record Notifications(List<Line> items) {}

  private final TaskRepository tasks;
  private final LeaveRequestRepository leaves;
  private final StaffDocumentRepository documents;
  private final TaskService taskService;
  private final ExpensesService expensesService;

  @Transactional(readOnly = true)
  public Notifications notifications(Long staffId) {
    List<Line> items = new ArrayList<>();
    LocalDate today = SystemDate.today();

    for (Task task : tasks.findAllByOrderByCreatedAtDesc()) {
      if (!staffId.equals(task.getAssigneeId()) || task.isArchived()) continue;
      LocalDate created = task.getCreatedAt() == null ? today : task.getCreatedAt().toLocalDate();
      items.add(new Line("task:" + task.getId(), "TASK", "Tarefa atribuída",
          task.getTitle(), "pending", created));
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

    items.sort(Comparator.comparing(Line::date).reversed().thenComparing(Line::id));
    return new Notifications(items);
  }

  private String format(LocalDate date) {
    return date == null ? "—" : String.format("%02d/%02d/%04d",
        date.getDayOfMonth(), date.getMonthValue(), date.getYear());
  }
}
