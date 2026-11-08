package mz.cacoin.tasks;

import java.time.LocalDate;
import mz.cacoin.users.UserAccountRepository;
import mz.cacoin.users.UserAccount;
import mz.cacoin.audit.AuditContext;
import mz.cacoin.teacher.TeacherContext;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import mz.cacoin.common.TextNormalizer;
import mz.cacoin.staff.StaffMember;
import mz.cacoin.staff.StaffRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class TaskService {
  private static final List<String> STATUSES = List.of("TODO", "IN_PROGRESS", "BLOCKED", "DONE");
  private static final List<String> PRIORITIES = List.of("LOW", "MEDIUM", "HIGH", "URGENT");
  private final TaskRepository tasks;
  private final StaffRepository staff;
  private final UserAccountRepository accounts;

  @Transactional(readOnly = true)
  public List<TaskResponse> list() {
    List<Task> all = tasks.findAllByOrderByCreatedAtDesc();
    Map<Long, String> names = staffNames(all.stream().flatMap(task -> personIds(task).stream()).toList());
    Map<Long, String> accountNames = accountNames(all);
    return all.stream().map(task -> response(task, names, accountNames)).toList();
  }

  @Transactional(readOnly = true)
  public List<TaskPersonResponse> people() {
    return staff.findAll().stream()
        .filter(StaffMember::isActive)
        .map(member -> new TaskPersonResponse(member.getId(), fullName(member), member.getStaffType()))
        .sorted(Comparator.comparing(TaskPersonResponse::name, String.CASE_INSENSITIVE_ORDER))
        .toList();
  }

  @Transactional(readOnly = true)
  public TaskResponse get(Long id) {
    return response(find(id));
  }

  @Transactional
  public TaskResponse create(TaskRequest request) {
    if (TeacherContext.active()) {
      throw TeacherContext.forbidden("O professor não pode criar nem alterar tarefas");
    }
    // Estado inicial fixo e criador = utilizador autenticado.
    if (request != null) {
      request = new TaskRequest(request.title(), request.description(), "TODO",
          request.priority(), request.category(), request.assigneeId(), currentStaffId(),
          request.startAt(), request.dueAt(), request.recurring(), request.recurrenceRule(),
          request.tags(), request.checklist());
    }
    Task task = new Task();
    apply(task, request);
    task.setCreatedByAccountId(currentAccountId());
    task.setCreatedAt(LocalDateTime.now());
    return response(tasks.save(task));
  }

  @Transactional
  public TaskResponse update(Long id, TaskRequest request) {
    if (TeacherContext.active()) {
      throw TeacherContext.forbidden("O professor não pode criar nem alterar tarefas");
    }
    Task task = find(id);
    // O estado muda na lista e o criador nunca muda.
    if (request != null) {
      request = new TaskRequest(request.title(), request.description(), task.getStatus(),
          request.priority(), request.category(), request.assigneeId(), task.getCreatedById(),
          request.startAt(), request.dueAt(), request.recurring(), request.recurrenceRule(),
          request.tags(), request.checklist());
    }
    apply(task, request);
    return response(tasks.save(task));
  }

  @Transactional
  public TaskResponse changeStatus(Long id, TaskStatusRequest request) {
    if (request == null || request.status() == null || !STATUSES.contains(request.status())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seleccione um estado válido");
    }
    Task task = find(id);
    task.setStatus(request.status());
    task.setCompletedAt("DONE".equals(request.status()) ? LocalDateTime.now() : null);
    task.setUpdatedAt(LocalDateTime.now());
    return response(tasks.save(task));
  }

  @Transactional
  public TaskResponse archive(Long id, TaskArchiveRequest request) {
    if (request == null || request.archived() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indique o estado do arquivo");
    }
    Task task = find(id);
    task.setArchived(request.archived());
    task.setUpdatedAt(LocalDateTime.now());
    return response(tasks.save(task));
  }

  @Transactional
  public void delete(Long id) {
    if (TeacherContext.active()) {
      throw TeacherContext.forbidden("O professor não pode criar nem alterar tarefas");
    }
    tasks.delete(find(id));
  }

  @Transactional
  public TaskResponse addComment(Long id, TaskCommentRequest request) {
    Task task = find(id);
    if (request == null || request.content() == null || request.content().trim().isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Escreva o comentário");
    }
    TaskComment comment = new TaskComment();
    comment.setTask(task);
    comment.setAuthorId(currentStaffId());
    comment.setAuthorAccountId(currentAccountId());
    comment.setContent(request.content().trim());
    comment.setCreatedAt(LocalDateTime.now());
    task.getComments().add(comment);
    task.setUpdatedAt(LocalDateTime.now());
    return response(tasks.save(task));
  }

  @Transactional
  public TaskResponse deleteComment(Long id, Long commentId) {
    Task task = find(id);
    boolean removed = task.getComments().removeIf(comment -> comment.getId().equals(commentId));
    if (!removed) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "O comentário não foi encontrado");
    task.setUpdatedAt(LocalDateTime.now());
    return response(tasks.save(task));
  }

  public record Notice(
      String id, String category, String title, String message, String tone, LocalDate date) {}

  public record Notices(List<Notice> items) {}

  /** Comentários de outras pessoas nas tarefas que o utilizador criou ou lhe foram atribuídas. */
  @Transactional(readOnly = true)
  public List<Notice> commentNotices() {
    Long staffId = currentStaffId();
    Long accountId = currentAccountId();
    List<Task> all = tasks.findAllByOrderByCreatedAtDesc().stream()
        .filter(task -> !task.isArchived())
        .filter(task -> (staffId != null
            && (staffId.equals(task.getAssigneeId()) || staffId.equals(task.getCreatedById())))
            || (accountId != null && accountId.equals(task.getCreatedByAccountId())))
        .toList();
    Map<Long, String> names = staffNames(all.stream().flatMap(task -> personIds(task).stream()).toList());
    Map<Long, String> accountNames = accountNames(all);
    List<Notice> notices = new ArrayList<>();
    for (Task task : all) {
      for (TaskComment comment : task.getComments()) {
        boolean mine = (accountId != null && accountId.equals(comment.getAuthorAccountId()))
            || (staffId != null && staffId.equals(comment.getAuthorId()));
        if (mine) continue;
        String author = comment.getAuthorId() != null
            ? names.getOrDefault(comment.getAuthorId(), "Utilizador")
            : accountNames.getOrDefault(comment.getAuthorAccountId(), "Utilizador");
        LocalDate date = comment.getCreatedAt() == null
            ? LocalDate.now() : comment.getCreatedAt().toLocalDate();
        notices.add(new Notice("task-comment:" + comment.getId(), "TASK", "Novo comentário",
            author + " comentou em «" + task.getTitle() + "»", "pending", date));
      }
    }
    return notices;
  }

  /** Quem está autenticado, para a caixa «Criada por» do formulário. */
  @Transactional(readOnly = true)
  public TaskPersonResponse me() {
    Long staffId = currentStaffId();
    if (staffId != null) {
      return staff.findById(staffId)
          .map(member -> new TaskPersonResponse(member.getId(), fullName(member), member.getStaffType()))
          .orElse(new TaskPersonResponse(staffId, "", "STAFF"));
    }
    Long accountId = currentAccountId();
    return new TaskPersonResponse(null, accountId == null ? "" : accountNames(accountId), "ADMIN");
  }

  private Long currentAccountId() {
    AuditContext.Actor actor = AuditContext.current();
    return actor == null ? null : actor.accountId();
  }

  private Long currentStaffId() {
    if (TeacherContext.active()) return TeacherContext.staffId();
    Long accountId = currentAccountId();
    if (accountId == null) return null;
    return accounts.findById(accountId)
        .filter(account -> UserAccount.STAFF.equals(account.getKind()))
        .map(UserAccount::getStaffId)
        .orElse(null);
  }

  private String accountNames(Long accountId) {
    return accounts.findById(accountId).map(this::accountName).orElse("");
  }

  private String accountName(UserAccount account) {
    String name = Stream.of(account.getFirstName(), account.getSurname())
        .filter(part -> part != null && !part.isBlank())
        .map(String::trim)
        .collect(Collectors.joining(" "));
    return name.isEmpty() ? String.valueOf(account.getCode()) : name;
  }

  /** Nomes das contas que criaram tarefas ou escreveram comentários sem serem staff. */
  private Map<Long, String> accountNames(Collection<Task> all) {
    Set<Long> ids = new java.util.HashSet<>();
    for (Task task : all) {
      if (task.getCreatedByAccountId() != null) ids.add(task.getCreatedByAccountId());
      task.getComments().forEach(comment -> {
        if (comment.getAuthorAccountId() != null) ids.add(comment.getAuthorAccountId());
      });
    }
    Map<Long, String> names = new HashMap<>();
    if (ids.isEmpty()) return names;
    for (UserAccount account : accounts.findAllById(ids)) {
      names.put(account.getId(), accountName(account));
    }
    return names;
  }

  private void apply(Task task, TaskRequest request) {
    if (request == null || request.title() == null || request.title().trim().isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indique o título da tarefa");
    }
    String title = request.title().trim();
    if (title.length() > 180) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O título excede 180 caracteres");
    String status = request.status() == null || request.status().isBlank() ? "TODO" : request.status();
    String priority = request.priority() == null || request.priority().isBlank() ? "MEDIUM" : request.priority();
    if (!STATUSES.contains(status)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado inválido");
    if (!PRIORITIES.contains(priority)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Prioridade inválida");
    if (request.startAt() != null && request.dueAt() != null && request.dueAt().isBefore(request.startAt())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O prazo não pode ser anterior à data de início");
    }
    task.setTitle(title);
    task.setDescription(request.description() == null ? "" : request.description().trim());
    task.setStatus(status);
    task.setPriority(priority);
    task.setCategory(clean(request.category(), "Geral", 80));
    if (TeacherContext.active()) {
      request = new TaskRequest(request.title(), request.description(), request.status(),
          request.priority(), request.category(), TeacherContext.staffId(),
          TeacherContext.staffId(), request.startAt(), request.dueAt(), request.recurring(),
          request.recurrenceRule(), request.tags(), request.checklist());
    }
    requireStaff(request.assigneeId(), "O responsável seleccionado não foi encontrado");
    requireStaff(request.createdById(), "A pessoa que criou a tarefa não foi encontrada");
    task.setAssigneeId(request.assigneeId());
    task.setCreatedById(request.createdById());
    task.setStartAt(request.startAt());
    task.setDueAt(request.dueAt());
    task.setRecurring(Boolean.TRUE.equals(request.recurring()));
    task.setRecurrenceRule(task.isRecurring() ? clean(request.recurrenceRule(), "WEEKLY", 20) : "");
    task.setCompletedAt("DONE".equals(status) ? (task.getCompletedAt() == null ? LocalDateTime.now() : task.getCompletedAt()) : null);
    List<String> tags = request.tags() == null ? List.of() : request.tags().stream()
        .filter(tag -> tag != null && !tag.trim().isEmpty()).map(String::trim).distinct().limit(30).toList();
    task.getTags().clear();
    task.getTags().addAll(tags);
    List<TaskChecklistItem> oldItems = new ArrayList<>(task.getChecklist());
    List<TaskChecklistItem> nextItems = new ArrayList<>();
    if (request.checklist() != null) {
      for (TaskRequest.ChecklistRequest item : request.checklist()) {
        if (item == null || item.title() == null || item.title().trim().isEmpty()) continue;
        TaskChecklistItem checklistItem = oldItems.stream()
            .filter(old -> item.id() != null && item.id().equals(old.getId())).findFirst()
            .orElseGet(TaskChecklistItem::new);
        checklistItem.setTask(task);
        checklistItem.setTitle(item.title().trim());
        checklistItem.setCompleted(Boolean.TRUE.equals(item.completed()));
        nextItems.add(checklistItem);
      }
    }
    task.getChecklist().removeIf(old -> nextItems.stream().noneMatch(next -> next == old));
    for (TaskChecklistItem item : nextItems) {
      if (!task.getChecklist().contains(item)) task.getChecklist().add(item);
    }
    task.setUpdatedAt(LocalDateTime.now());
  }

  private String clean(String value, String fallback, int max) {
    String result = value == null ? fallback : TextNormalizer.normalize(value).trim();
    if (result.length() > max) result = result.substring(0, max);
    return result;
  }

  private void requireStaff(Long staffId, String message) {
    if (staffId != null && !staff.existsById(staffId)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
  }

  private List<Long> personIds(Task task) {
    List<Long> ids = new ArrayList<>();
    ids.add(task.getAssigneeId());
    ids.add(task.getCreatedById());
    task.getComments().forEach(comment -> ids.add(comment.getAuthorId()));
    return ids;
  }

  /** Nomes lidos da tabela staff_members pelos IDs (nunca guardados nas tarefas). */
  private Map<Long, String> staffNames(Collection<Long> ids) {
    Set<Long> unique = ids.stream().filter(Objects::nonNull).collect(Collectors.toSet());
    Map<Long, String> names = new HashMap<>();
    if (unique.isEmpty()) return names;
    for (StaffMember member : staff.findAllById(unique)) {
      names.put(member.getId(), fullName(member));
    }
    return names;
  }

  private String fullName(StaffMember member) {
    return Stream.of(member.getFirstName(), member.getSurname())
        .filter(part -> part != null && !part.isBlank())
        .map(String::trim)
        .collect(Collectors.joining(" "));
  }

  private Task find(Long id) {
    return tasks.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "A tarefa não foi encontrada"));
  }

  private TaskResponse response(Task task) {
    return response(task, staffNames(personIds(task)), accountNames(List.of(task)));
  }

  private TaskResponse response(Task task, Map<Long, String> names, Map<Long, String> accountNames) {
    return new TaskResponse(task.getId(), task.getTitle(), task.getDescription(), task.getStatus(), task.getPriority(), task.getCategory(), task.getAssigneeId(), names.getOrDefault(task.getAssigneeId(), ""), task.getCreatedById(), task.getCreatedById() != null ? names.getOrDefault(task.getCreatedById(), "") : accountNames.getOrDefault(task.getCreatedByAccountId(), ""), task.getStartAt(), task.getDueAt(), task.getCompletedAt(), task.isArchived(), task.isRecurring(), task.getRecurrenceRule(), List.copyOf(task.getTags()), task.getChecklist().stream().map(item -> new TaskResponse.ChecklistResponse(item.getId(), item.getTitle(), item.isCompleted())).toList(), task.getComments().stream().map(comment -> new TaskResponse.CommentResponse(comment.getId(), comment.getAuthorId(), comment.getAuthorId() != null ? names.getOrDefault(comment.getAuthorId(), "Utilizador") : accountNames.getOrDefault(comment.getAuthorAccountId(), "Utilizador"), comment.getContent(), comment.getCreatedAt())).toList(), task.getCreatedAt(), task.getUpdatedAt());
  }
}
