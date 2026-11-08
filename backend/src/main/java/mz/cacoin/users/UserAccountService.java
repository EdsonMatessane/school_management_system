package mz.cacoin.users;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import mz.cacoin.statuses.StatusModules;
import mz.cacoin.statuses.SystemStatus;
import mz.cacoin.statuses.SystemStatusService;
import mz.cacoin.staff.StaffResponse;
import mz.cacoin.staff.StaffService;
import mz.cacoin.students.StudentManagementResponse;
import mz.cacoin.students.StudentService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class UserAccountService {
  private static final String PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  private static final List<String> STAFF_TYPES = List.of("hr", "teachers", "other");

  private final UserAccountRepository accounts;
  private final UserSettingsService settings;
  private final PasswordHasher hasher;
  private final StudentService students;
  private final StaffService staff;
  private final SystemStatusService statuses;
  private final SecureRandom random = new SecureRandom();

  @Transactional
  public List<UserDtos.AccountResponse> list(String kind) {
    String accountKind = validKind(kind);
    Map<Long, StudentManagementResponse> studentsById = new HashMap<>();
    Map<Long, StaffResponse> staffById = new HashMap<>();
    if (UserAccount.STUDENT.equals(accountKind)) {
      studentsById = students.list().stream()
          .collect(Collectors.toMap(StudentManagementResponse::id, item -> item));
      syncStudents(studentsById);
    } else if (UserAccount.STAFF.equals(accountKind)) {
      Map<Long, StaffResponse> loadedStaff = new HashMap<>();
      for (String type : STAFF_TYPES) {
        staff.list(type).forEach(item -> loadedStaff.put(item.id(), item));
      }
      staffById = loadedStaff;
      syncStaff(staffById);
    }
    Map<String, SystemStatus> labels = statuses.lookup(StatusModules.USERS);
    List<UserDtos.AccountResponse> responses = new ArrayList<>();
    for (UserAccount account : accounts.findAllByKindOrderByIdAsc(accountKind)) {
      responses.add(toResponse(
          account, labels, studentsById.get(account.getStudentId()), staffById.get(account.getStaffId())));
    }
    return responses;
  }

  @Transactional
  public UserDtos.CredentialResponse createAdmin(UserDtos.AdminRequest request) {
    String firstName = required(request == null ? null : request.firstName(), "o nome");
    String surname = required(request.surname(), "o apelido");
    String[] window = settings.window(request.accessStart(), request.accessEnd());
    statuses.requireActive(StatusModules.USERS, UserAccount.ACTIVE);
    accounts.lockAdminNumbering();
    int number = accounts.nextAdminNumber();
    UserAccount account = new UserAccount();
    account.setKind(UserAccount.ADMIN);
    account.setAdminNumber(number);
    account.setCode(String.format(Locale.ROOT, "ADM%04d", number));
    account.setFirstName(firstName);
    account.setSurname(surname);
    account.setAccessStart(window[0]);
    account.setAccessEnd(window[1]);
    account.setNotes(optional(request.notes()));
    String temporaryPassword = temporaryPassword();
    account.setPasswordHash(hasher.hash(temporaryPassword));
    account.setMustChangePassword(true);
    account.setStatus(UserAccount.ACTIVE);
    UserAccount saved = accounts.save(account);
    return new UserDtos.CredentialResponse(response(saved), temporaryPassword);
  }

  @Transactional
  public UserDtos.CredentialResponse updateAdmin(Long id, UserDtos.AdminRequest request) {
    UserAccount account = find(id);
    if (!UserAccount.ADMIN.equals(account.getKind())) {
      throw badRequest("A conta não é de administrador");
    }
    account.setFirstName(required(request == null ? null : request.firstName(), "o nome"));
    account.setSurname(required(request.surname(), "o apelido"));
    String[] window = settings.window(request.accessStart(), request.accessEnd());
    account.setAccessStart(window[0]);
    account.setAccessEnd(window[1]);
    account.setNotes(optional(request.notes()));
    return new UserDtos.CredentialResponse(response(accounts.save(account)), null);
  }

  @Transactional
  public UserDtos.CredentialResponse apply(Long id, String action) {
    UserAccount account = find(id);
    String temporaryPassword = null;
    Instant now = Instant.now();
    switch (action) {
      case "activation" -> {
        require(account, Set.of(UserAccount.INACTIVE, UserAccount.FINISHED),
            "Só é possível activar contas inactivas ou terminadas");
        statuses.requireActive(StatusModules.USERS, UserAccount.ACTIVE);
        account.setStatus(UserAccount.ACTIVE);
        account.setFailedAttempts(0);
        account.setDeactivatedAt(null);
        account.setFinishedAt(null);
      }
      case "deactivation" -> {
        require(account, Set.of(UserAccount.ACTIVE), "Só é possível desactivar contas activas");
        keepOneAdmin(account);
        statuses.requireActive(StatusModules.USERS, UserAccount.INACTIVE);
        account.setStatus(UserAccount.INACTIVE);
        account.setDeactivatedAt(now);
      }
      case "unlock" -> {
        require(account, Set.of(UserAccount.LOCKED), "Só é possível desbloquear contas autobloqueadas");
        statuses.requireActive(StatusModules.USERS, UserAccount.ACTIVE);
        account.setStatus(UserAccount.ACTIVE);
        account.setFailedAttempts(0);
        account.setLockedAt(null);
      }
      case "termination" -> {
        require(account, Set.of(UserAccount.ACTIVE, UserAccount.INACTIVE, UserAccount.LOCKED),
            "A conta já está terminada");
        keepOneAdmin(account);
        statuses.requireActive(StatusModules.USERS, UserAccount.FINISHED);
        account.setStatus(UserAccount.FINISHED);
        account.setFinishedAt(now);
      }
      case "password-reset" -> {
        account.setFailedAttempts(0);
        account.setMustChangePassword(true);
        if (UserAccount.ADMIN.equals(account.getKind())) {
          temporaryPassword = temporaryPassword();
          account.setPasswordHash(hasher.hash(temporaryPassword));
        } else {
          account.setPasswordHash(null);
        }
      }
      default -> throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Acção desconhecida");
    }
    return new UserDtos.CredentialResponse(response(accounts.save(account)), temporaryPassword);
  }

  private void syncStudents(Map<Long, StudentManagementResponse> people) {
    Map<Long, UserAccount> existing = accounts.findAllByKindOrderByIdAsc(UserAccount.STUDENT).stream()
        .collect(Collectors.toMap(UserAccount::getStudentId, item -> item, (first, ignored) -> first));
    List<UserAccount> changed = new ArrayList<>();
    for (StudentManagementResponse person : people.values()) {
      UserAccount account = existing.get(person.id());
      if (account == null) {
        account = new UserAccount();
        account.setKind(UserAccount.STUDENT);
        account.setStudentId(person.id());
        account.setCode(person.studentCode());
        changed.add(account);
      } else if (!person.studentCode().equals(account.getCode())) {
        account.setCode(person.studentCode());
        changed.add(account);
      }
    }
    existing.values().stream()
        .filter(account -> !people.containsKey(account.getStudentId()))
        .forEach(accounts::delete);
    accounts.saveAll(changed);
  }

  private void syncStaff(Map<Long, StaffResponse> people) {
    Map<Long, UserAccount> existing = accounts.findAllByKindOrderByIdAsc(UserAccount.STAFF).stream()
        .collect(Collectors.toMap(UserAccount::getStaffId, item -> item, (first, ignored) -> first));
    List<UserAccount> changed = new ArrayList<>();
    for (StaffResponse person : people.values()) {
      UserAccount account = existing.get(person.id());
      if (account == null) {
        account = new UserAccount();
        account.setKind(UserAccount.STAFF);
        account.setStaffId(person.id());
        account.setCode(person.staffCode());
        changed.add(account);
      } else if (!person.staffCode().equals(account.getCode())) {
        account.setCode(person.staffCode());
        changed.add(account);
      }
    }
    existing.values().stream()
        .filter(account -> !people.containsKey(account.getStaffId()))
        .forEach(accounts::delete);
    accounts.saveAll(changed);
  }

  private UserDtos.AccountResponse response(UserAccount account) {
    return toResponse(account, statuses.lookup(StatusModules.USERS), null, null);
  }

  private UserDtos.AccountResponse toResponse(
      UserAccount account,
      Map<String, SystemStatus> labels,
      StudentManagementResponse student,
      StaffResponse member) {
    SystemStatus status = labels.get(account.getStatus());
    String name = switch (account.getKind()) {
      case UserAccount.STUDENT -> student == null ? null : fullName(student.firstName(), student.surname());
      case UserAccount.STAFF -> member == null ? null : fullName(member.firstName(), member.surname());
      default -> fullName(account.getFirstName(), account.getSurname());
    };
    return new UserDtos.AccountResponse(
        account.getId(),
        account.getKind(),
        account.getCode(),
        UserAccount.STUDENT.equals(account.getKind()) ? account.getStudentId() : account.getStaffId(),
        name,
        UserAccount.ADMIN.equals(account.getKind()) ? account.getFirstName() : null,
        UserAccount.ADMIN.equals(account.getKind()) ? account.getSurname() : null,
        member == null ? null : member.positionName(),
        student == null ? null : student.courseName(),
        student == null ? null : student.categoryName(),
        student == null ? null : student.levelName(),
        student == null ? null : student.modalityName(),
        account.getNotes(),
        account.getAccessStart(),
        account.getAccessEnd(),
        account.getStatus(),
        status == null ? account.getStatus() : status.getLabel(),
        status == null ? "neutral" : status.getTone(),
        account.getFailedAttempts(),
        account.getCreatedAt(),
        account.getLastAccessAt(),
        account.getDeactivatedAt(),
        account.getLockedAt(),
        account.getFinishedAt());
  }

  private void keepOneAdmin(UserAccount account) {
    if (UserAccount.ADMIN.equals(account.getKind())
        && UserAccount.ACTIVE.equals(account.getStatus())
        && accounts.countByKindAndStatus(UserAccount.ADMIN, UserAccount.ACTIVE) <= 1) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Tem de existir pelo menos um administrador activo");
    }
  }

  private void require(UserAccount account, Set<String> allowed, String message) {
    if (!allowed.contains(account.getStatus())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
  }

  private UserAccount find(Long id) {
    return accounts.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "A conta não foi encontrada"));
  }

  private String validKind(String kind) {
    String value = kind == null ? "" : kind.trim().toUpperCase(Locale.ROOT);
    if (!Set.of(UserAccount.ADMIN, UserAccount.STUDENT, UserAccount.STAFF).contains(value)) {
      throw badRequest("Tipo de conta inválido");
    }
    return value;
  }

  private String temporaryPassword() {
    StringBuilder password = new StringBuilder();
    for (int index = 0; index < 10; index++) {
      password.append(PASSWORD_ALPHABET.charAt(random.nextInt(PASSWORD_ALPHABET.length())));
    }
    return password.toString();
  }

  private String required(String value, String label) {
    String text = value == null ? "" : value.trim();
    if (text.isEmpty() || text.length() > 120) {
      throw badRequest("Indique " + label);
    }
    return text;
  }

  private String optional(String value) {
    String text = value == null ? "" : value.trim();
    return text.isEmpty() ? null : text;
  }

  private String fullName(String first, String surname) {
    return java.util.stream.Stream.of(first, surname)
        .filter(item -> item != null && !item.isBlank())
        .map(String::trim)
        .collect(Collectors.joining(" "));
  }

  private ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
