package mz.cacoin.tasks;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "tasks")
@Getter
@Setter
@NoArgsConstructor
public class Task {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 180)
  private String title;

  @Column(columnDefinition = "TEXT")
  private String description = "";

  @Column(nullable = false, length = 24)
  private String status = "TODO";

  @Column(nullable = false, length = 24)
  private String priority = "MEDIUM";

  @Column(nullable = false, length = 80)
  private String category = "Geral";

  /** Pessoa responsável: só o ID em staff_members; o nome vem sempre dessa tabela. */
  @Column(name = "assignee_id")
  private Long assigneeId;

  /** Quem criou a tarefa: só o ID em staff_members. */
  @Column(name = "created_by_id")
  private Long createdById;

  /** Conta (user_accounts) que criou a tarefa: identifica também administradores sem staff. */
  @Column(name = "created_by_account_id")
  private Long createdByAccountId;

  @Column(name = "start_at")
  private LocalDateTime startAt;

  @Column(name = "due_at")
  private LocalDateTime dueAt;

  @Column(name = "completed_at")
  private LocalDateTime completedAt;

  @Column(nullable = false)
  private boolean archived = false;

  @Column(nullable = false)
  private boolean recurring = false;

  @Column(name = "recurrence_rule", length = 20)
  private String recurrenceRule = "";

  @ElementCollection
  @jakarta.persistence.CollectionTable(name = "task_tags", joinColumns = @jakarta.persistence.JoinColumn(name = "task_id"))
  @Column(name = "tag_name", length = 60)
  private List<String> tags = new ArrayList<>();

  @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("id ASC")
  private List<TaskChecklistItem> checklist = new ArrayList<>();

  @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("createdAt ASC")
  private List<TaskComment> comments = new ArrayList<>();

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt = LocalDateTime.now();

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt = LocalDateTime.now();
}
