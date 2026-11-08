package mz.cacoin.teacher;

import mz.cacoin.users.UserAccountRepository;
import mz.cacoin.users.UserAccount;
import mz.cacoin.audit.AuditContext;
import java.util.Set;
import mz.cacoin.staff.StaffResponse;
import mz.cacoin.staff.StaffService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/teacher")
public class TeacherController {
  public record TeacherProfile(StaffResponse staff, Set<Long> courseIds) {}

  private final StaffService staff;
  private final UserAccountRepository accounts;
  private final TeacherNotificationService notifications;

  public TeacherController(
      StaffService staff, UserAccountRepository accounts, TeacherNotificationService notifications) {
    this.staff = staff;
    this.accounts = accounts;
    this.notifications = notifications;
  }

  @GetMapping("/notifications")
  public TeacherNotificationService.Notifications notifications() {
    TeacherContext.Scope scope = TeacherContext.current();
    if (scope == null) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "A conta não é de um professor");
    }
    return notifications.notifications(scope.staffId());
  }

  /** Perfil do professor autenticado; recusa contas que não são de professores. */
  @GetMapping("/me")
  public TeacherProfile me() {
    TeacherContext.Scope scope = TeacherContext.current();
    if (scope == null) {
      return hrProfile();
    }
    StaffResponse self = staff.list(scope.staffType()).stream()
        .filter(item -> scope.staffId().equals(item.id()))
        .findFirst()
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O professor não foi encontrado"));
    return new TeacherProfile(self, scope.courseIds());
  }

  /** Funcionário de RH: usa o sistema geral e só tem «Meu Perfil» como área pessoal. */
  private TeacherProfile hrProfile() {
    AuditContext.Actor actor = AuditContext.current();
    UserAccount account = actor == null ? null : accounts.findById(actor.accountId()).orElse(null);
    if (account == null || !UserAccount.STAFF.equals(account.getKind())
        || account.getStaffId() == null) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "A conta não é de um funcionário com portal");
    }
    StaffResponse self = staff.list(TeacherPolicy.HR).stream()
        .filter(item -> account.getStaffId().equals(item.id()))
        .findFirst()
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.FORBIDDEN, "A conta não é de um funcionário com portal"));
    return new TeacherProfile(self, Set.of());
  }
}
