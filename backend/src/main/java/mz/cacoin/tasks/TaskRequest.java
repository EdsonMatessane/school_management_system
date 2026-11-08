package mz.cacoin.tasks;

import java.time.LocalDateTime;
import java.util.List;

public record TaskRequest(
    String title,
    String description,
    String status,
    String priority,
    String category,
    Long assigneeId,
    Long createdById,
    LocalDateTime startAt,
    LocalDateTime dueAt,
    Boolean recurring,
    String recurrenceRule,
    List<String> tags,
    List<ChecklistRequest> checklist) {
  public record ChecklistRequest(Long id, String title, Boolean completed) {}
}
