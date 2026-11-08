package mz.cacoin.leaves;

import java.time.LocalDate;
import java.util.List;

public final class LeaveDtos {
  private LeaveDtos() {}

  public record SettingsRequest(Integer maxRequestsPerMonth) {}

  public record SettingsResponse(Integer maxRequestsPerMonth) {}

  public record Request(
      Long staffId, LocalDate leaveDate, LocalDate returnDate, String reason) {}

  public record StatusRequest(String status) {}

  public record CourseResponse(
      Long courseId,
      String courseName,
      String categoryName,
      String levelName,
      String modalityName) {}

  public record Response(
      Long id,
      Long staffId,
      String staffCode,
      String staffName,
      String staffType,
      String phone,
      String biNumber,
      String positionName,
      List<CourseResponse> courses,
      LocalDate requestDate,
      LocalDate leaveDate,
      LocalDate returnDate,
      String reason,
      Integer daysCalculated,
      String status,
      String statusLabel,
      String statusTone) {}
}
