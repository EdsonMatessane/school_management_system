package mz.cacoin.tasks;

import java.time.LocalDateTime;
import java.util.List;

public record TaskResponse(
    Long id,
    String title,
    String description,
    String status,
    String priority,
    String category,
    Long assigneeId,
    String assignee,
    Long createdById,
    String createdBy,
    LocalDateTime startAt,
    LocalDateTime dueAt,
    LocalDateTime completedAt,
    boolean archived,
    boolean recurring,
    String recurrenceRule,
    List<String> tags,
    List<ChecklistResponse> checklist,
    List<CommentResponse> comments,
    LocalDateTime createdAt,
    LocalDateTime updatedAt) {
  public record ChecklistResponse(Long id, String title, boolean completed) {}
  public record CommentResponse(
      Long id, Long authorId, String author, String content, LocalDateTime createdAt) {}
}
