package mz.cacoin.users;

import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.concurrent.atomic.AtomicLong;
import lombok.RequiredArgsConstructor;
import mz.cacoin.audit.AuditContext;
import mz.cacoin.audit.AuditRecorder;
import mz.cacoin.settings.SystemSettings;
import mz.cacoin.settings.SystemSettingsRepository;
import mz.cacoin.staff.StaffMember;
import mz.cacoin.staff.StaffRepository;
import mz.cacoin.students.Student;
import mz.cacoin.students.StudentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AuthService {
  private static final String INVALID = "O código ou a palavra-passe estão incorrectos";
  /** Intervalo mínimo entre sincronizações de contas disparadas por códigos desconhecidos. */
  private static final long LAZY_SYNC_MILLIS = 15_000L;

  private final AtomicLong lastLazySync = new AtomicLong();

  private final UserAccountRepository accounts;
  private final UserSettingsService settings;
  private final PasswordPolicy policy;
  private final PasswordHasher hasher;
  private final TokenService tokens;
  private final StudentRepository students;
  private final StaffRepository staff;
  private final SystemSettingsRepository systemSettings;
  private final AuditRecorder auditRecorder;
  private final UserAccountService accountService;

  @Transactional(noRollbackFor = ResponseStatusException.class)
  public UserDtos.AuthResponse login(UserDtos.LoginRequest request) {
    if (request == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, INVALID);
    }
    UserAccount account = authenticate(request.username(), request.password());
    if (account.isMustChangePassword()) {
      return response(account, null);
    }
    return response(account, complete(account));
  }

  @Transactional(noRollbackFor = ResponseStatusException.class)
  public UserDtos.AuthResponse changePassword(UserDtos.ChangePasswordRequest request) {
    if (request == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, INVALID);
    }
    UserAccount account = authenticate(request.username(), request.currentPassword());
    String newPassword = request.newPassword();
    policy.validate(settings.current(), newPassword);
    if (newPassword.equals(request.currentPassword())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "A nova palavra-passe tem de ser diferente da actual");
    }
    account.setPasswordHash(hasher.hash(newPassword));
    account.setMustChangePassword(false);
    return response(account, complete(account));
  }

  private UserAccount authenticate(String username, String password) {
    String code = username == null ? "" : username.trim();
    if (code.isEmpty() || password == null || password.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, INVALID);
    }
    UserAccount account = accounts.findByCodeIgnoreCase(code)
        .or(() -> {
          // Contas de estudantes e funcionários criam-se na primeira consulta. Como este
          // endpoint é público, a sincronização (que lê todas as pessoas) tem limite de ritmo.
          long now = System.currentTimeMillis();
          long last = lastLazySync.get();
          if (now - last >= LAZY_SYNC_MILLIS && lastLazySync.compareAndSet(last, now)) {
            accountService.list(UserAccount.STUDENT);
            accountService.list(UserAccount.STAFF);
          }
          return accounts.findByCodeIgnoreCase(code);
        })
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, INVALID));
    switch (account.getStatus()) {
      case UserAccount.INACTIVE -> throw forbidden("A conta está desactivada");
      case UserAccount.LOCKED -> throw forbidden("A conta está bloqueada por excesso de tentativas");
      case UserAccount.FINISHED -> throw forbidden("A conta foi terminada");
      default -> { }
    }
    if (!withinAccessWindow(account)) {
      throw forbidden("Fora do horário de acesso");
    }
    if (!passwordMatches(account, password)) {
      UserSettings current = settings.current();
      account.setFailedAttempts(account.getFailedAttempts() + 1);
      if (account.getFailedAttempts() >= current.getMaxAttempts()) {
        account.setStatus(UserAccount.LOCKED);
        account.setLockedAt(Instant.now());
        accounts.save(account);
        throw forbidden("A conta foi bloqueada por excesso de tentativas");
      }
      accounts.save(account);
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, INVALID);
    }
    account.setFailedAttempts(0);
    return accounts.save(account);
  }

  private String complete(UserAccount account) {
    account.setLastAccessAt(Instant.now());
    accounts.save(account);
    if (!UserAccount.STUDENT.equals(account.getKind())) {
      auditRecorder.log(
          new AuditContext.Actor(account.getId(), account.getCode(), account.getKind()),
          "LOGIN", "UserAccount", account.getId(), null);
    }
    return tokens.issue(account);
  }

  private boolean passwordMatches(UserAccount account, String password) {
    if (account.getPasswordHash() != null) {
      return hasher.matches(password, account.getPasswordHash());
    }
    String initial = initialPassword(account);
    return initial != null && hasher.sameText(initial, password);
  }

  private String initialPassword(UserAccount account) {
    String phone = null;
    if (UserAccount.STUDENT.equals(account.getKind()) && account.getStudentId() != null) {
      phone = students.findById(account.getStudentId()).map(this::studentPhone).orElse(null);
    } else if (UserAccount.STAFF.equals(account.getKind()) && account.getStaffId() != null) {
      phone = staff.findById(account.getStaffId()).map(this::staffPhone).orElse(null);
    }
    String digits = phone == null ? "" : phone.replaceAll("\\D", "");
    if (digits.startsWith("258") && digits.length() > 9) {
      digits = digits.substring(3);
    }
    return digits.isEmpty() ? null : digits;
  }

  private String studentPhone(Student student) {
    return firstFilled(student.getPhone(), student.getWhatsappNumber(), student.getSmsNumber());
  }

  private String staffPhone(StaffMember member) {
    return firstFilled(member.getPhone(), member.getWhatsappNumber(), member.getSmsNumber());
  }

  private String firstFilled(String... values) {
    for (String value : values) {
      if (value != null && !value.isBlank()) return value;
    }
    return null;
  }

  private boolean withinAccessWindow(UserAccount account) {
    UserSettings current = settings.current();
    String start;
    String end;
    switch (account.getKind()) {
      case UserAccount.STUDENT -> {
        start = current.getStudentAccessStart();
        end = current.getStudentAccessEnd();
      }
      case UserAccount.STAFF -> {
        start = current.getStaffAccessStart();
        end = current.getStaffAccessEnd();
      }
      default -> {
        start = account.getAccessStart();
        end = account.getAccessEnd();
      }
    }
    if (start == null || end == null) {
      return true;
    }
    SystemSettings system = systemSettings.findById(1L).orElseGet(SystemSettings::new);
    LocalTime now = LocalTime.now(ZoneId.of(system.getTimeZone())).withSecond(0).withNano(0);
    LocalTime from = LocalTime.parse(start);
    LocalTime to = LocalTime.parse(end);
    return from.isBefore(to)
        ? !now.isBefore(from) && !now.isAfter(to)
        : !now.isBefore(from) || !now.isAfter(to);
  }

  private UserDtos.AuthResponse response(UserAccount account, String token) {
    String name = (UserAccount.ADMIN.equals(account.getKind()))
        ? ((account.getFirstName() == null ? "" : account.getFirstName()) + " "
            + (account.getSurname() == null ? "" : account.getSurname())).trim()
        : account.getCode();
    return new UserDtos.AuthResponse(
        token, account.isMustChangePassword(), account.getKind(), account.getCode(), name);
  }

  private ResponseStatusException forbidden(String message) {
    return new ResponseStatusException(HttpStatus.FORBIDDEN, message);
  }
}
