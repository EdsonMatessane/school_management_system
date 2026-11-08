package mz.cacoin.tasks;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {
  private final TaskService tasks;

  @GetMapping
  public List<TaskResponse> list() { return tasks.list(); }

  /** Pessoas (staff activo) que se podem escolher como responsável, criador ou autor. */
  @GetMapping("/people")
  public List<TaskPersonResponse> people() { return tasks.people(); }

  /** Novos comentários nas tarefas do utilizador (sino das notificações). */
  @GetMapping("/notifications")
  public TaskService.Notices notifications() { return new TaskService.Notices(tasks.commentNotices()); }

  /** Utilizador autenticado (criador das novas tarefas e autor dos comentários). */
  @GetMapping("/me")
  public TaskPersonResponse me() { return tasks.me(); }

  @GetMapping("/{id}")
  public TaskResponse get(@PathVariable Long id) { return tasks.get(id); }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public TaskResponse create(@RequestBody TaskRequest request) { return tasks.create(request); }

  @PutMapping("/{id}")
  public TaskResponse update(@PathVariable Long id, @RequestBody TaskRequest request) { return tasks.update(id, request); }

  @PatchMapping("/{id}/status")
  public TaskResponse changeStatus(@PathVariable Long id, @RequestBody TaskStatusRequest request) { return tasks.changeStatus(id, request); }

  @PatchMapping("/{id}/archive")
  public TaskResponse archive(@PathVariable Long id, @RequestBody TaskArchiveRequest request) { return tasks.archive(id, request); }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Long id) { tasks.delete(id); }

  @PostMapping("/{id}/comments")
  @ResponseStatus(HttpStatus.CREATED)
  public TaskResponse addComment(@PathVariable Long id, @RequestBody TaskCommentRequest request) { return tasks.addComment(id, request); }

  @DeleteMapping("/{id}/comments/{commentId}")
  public TaskResponse deleteComment(@PathVariable Long id, @PathVariable Long commentId) { return tasks.deleteComment(id, commentId); }
}
