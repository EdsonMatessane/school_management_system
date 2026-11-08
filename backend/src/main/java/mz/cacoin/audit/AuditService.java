package mz.cacoin.audit;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import mz.cacoin.common.StaffCodes;
import mz.cacoin.staff.StaffRepository;
import mz.cacoin.users.UserAccount;
import mz.cacoin.users.UserAccountRepository;
import mz.cacoin.users.UserAccountService;
import mz.cacoin.users.UserDtos;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AuditService {
  private static final int MAX_LOGS = 20_000;
  private static final Pattern ENTITY = Pattern.compile("^[A-Za-z]{1,80}$");

  private final UserLogRepository logs;
  private final RecordAuditRepository records;
  private final UserAccountRepository accounts;
  private final UserAccountService accountService;
  private final StaffRepository staff;
  private final ObjectMapper mapper;
  private final AuditLabels labels;

  @Transactional
  public List<AuditDtos.LogUserResponse> users() {
    Map<Long, Object[]> summary = new HashMap<>();
    for (Object[] row : logs.summarize()) {
      if (row[0] != null) summary.put((Long) row[0], row);
    }
    List<UserDtos.AccountResponse> people = new java.util.ArrayList<>(accountService.list(UserAccount.ADMIN));
    people.addAll(accountService.list(UserAccount.STAFF));
    return people.stream().map(person -> {
      Object[] row = summary.get(person.id());
      return new AuditDtos.LogUserResponse(
          person.id(),
          person.kind(),
          person.code(),
          person.name(),
          person.position(),
          person.status(),
          row == null ? 0 : (Long) row[1],
          row == null ? null : (Instant) row[2]);
    }).toList();
  }

  @Transactional(readOnly = true)
  public List<AuditDtos.LogResponse> logs(Long accountId) {
    List<UserLog> found = accountId == null
        ? logs.findAllByOrderByCreatedAtDescIdDesc(PageRequest.of(0, MAX_LOGS))
        : logs.findAllByAccountIdOrderByCreatedAtDescIdDesc(accountId, PageRequest.of(0, MAX_LOGS));
    Map<Long, String> names = names(found.stream().map(UserLog::getAccountId).toList());
    return found.stream().map(log -> new AuditDtos.LogResponse(
        log.getId(),
        log.getAccountId(),
        log.getActorCode(),
        names.get(log.getAccountId()),
        log.getAction(),
        log.getEntityName(),
        log.getEntityId(),
        reference(log),
        parse(log.getChanges()),
        log.getCreatedAt())).toList();
  }

  @Transactional(readOnly = true)
  public AuditDtos.RecordResponse record(String entity, Long id) {
    if (entity == null || !ENTITY.matcher(entity).matches()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Entidade inválida");
    }
    RecordAudit audit = records.findByEntityNameAndEntityId(entity, id).orElse(null);
    if (audit == null) {
      return new AuditDtos.RecordResponse(null, null);
    }
    Map<Long, UserAccount> found = new HashMap<>();
    for (Long accountId : java.util.stream.Stream.of(
        audit.getEntryAccountId(), audit.getAuthorizationAccountId())
        .filter(java.util.Objects::nonNull).toList()) {
      accounts.findById(accountId).ifPresent(account -> found.put(accountId, account));
    }
    return new AuditDtos.RecordResponse(
        person(audit.getEnteredAt(), audit.getEntryAccountId(), found),
        person(audit.getAuthorizedAt(), audit.getAuthorizationAccountId(), found));
  }

  private AuditDtos.PersonResponse person(Instant at, Long accountId, Map<Long, UserAccount> found) {
    if (at == null && accountId == null) return null;
    UserAccount account = accountId == null ? null : found.get(accountId);
    return new AuditDtos.PersonResponse(
        at, account == null ? null : account.getCode(), account == null ? null : name(account));
  }

  private Map<Long, String> names(List<Long> accountIds) {
    Map<Long, String> names = new HashMap<>();
    accounts.findAllById(accountIds.stream().filter(java.util.Objects::nonNull).distinct().toList())
        .forEach(account -> names.put(account.getId(), name(account)));
    return names;
  }

  private String name(UserAccount account) {
    if (UserAccount.STAFF.equals(account.getKind()) && account.getStaffId() != null) {
      return staff.findById(account.getStaffId()).map(StaffCodes::fullName).orElse(null);
    }
    String first = account.getFirstName() == null ? "" : account.getFirstName().trim();
    String surname = account.getSurname() == null ? "" : account.getSurname().trim();
    return (first + " " + surname).trim();
  }

  private String reference(UserLog log) {
    if (log.getEntityRef() != null && !log.getEntityRef().isBlank()) return log.getEntityRef();
    return "DELETE".equals(log.getAction())
        ? null
        : labels.reference(log.getEntityName(), log.getEntityId());
  }

  private List<AuditRecorder.Change> parse(String json) {
    if (json == null || json.isBlank()) return List.of();
    try {
      return mapper.readValue(json, new TypeReference<List<AuditRecorder.Change>>() {});
    } catch (java.io.IOException exception) {
      return List.of();
    }
  }
}
