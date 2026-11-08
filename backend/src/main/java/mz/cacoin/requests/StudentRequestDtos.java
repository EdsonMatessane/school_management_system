package mz.cacoin.requests;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class StudentRequestDtos {
  private StudentRequestDtos() {}

  public record Request(Long studentId, Long courseId, Long typeId, String description) {}

  public record RejectionRequest(String notes) {}

  public record AttachmentResponse(Long id, String fileName, String contentType) {}

  public record Response(
      Long id,
      String requestNumber,
      Long studentId,
      String studentCode,
      String studentName,
      Long courseId,
      String courseName,
      Long categoryId,
      String categoryName,
      Long levelId,
      String levelName,
      Long modalityId,
      String modalityName,
      Long typeId,
      String typeName,
      String description,
      List<AttachmentResponse> attachments,
      LocalDate requestDate,
      String status,
      String statusLabel,
      String statusTone,
      String notes,
      String statusMessage,
      Instant statusAt) {}

  public record TypeRequest(String name) {}

  public record TypeResponse(Long id, String name, LocalDate createdAt) {}

  public record SettingsRequest(
      String approveMessage, String rejectMessage, String completeMessage) {}

  public record SettingsResponse(
      String approveMessage, String rejectMessage, String completeMessage) {}
}
