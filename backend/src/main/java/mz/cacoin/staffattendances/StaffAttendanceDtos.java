package mz.cacoin.staffattendances;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class StaffAttendanceDtos {
  private StaffAttendanceDtos() {}

  public record RecordRequest(Long staffId, LocalDate date, String status) {}

  public record StatusRequest(String status) {}

  public record PaymentRequest(LocalDate paymentDate, String method, String reference) {}

  public record PaymentResponse(
      Long id, BigDecimal amount, LocalDate paymentDate, String method, String reference) {}

  public record CourseResponse(
      Long courseId,
      String courseName,
      String categoryName,
      String levelName,
      String modalityName) {}

  public record RecordResponse(
      Long id,
      Long staffId,
      String staffCode,
      String staffName,
      String staffType,
      String positionName,
      List<CourseResponse> courses,
      LocalDate date,
      String status,
      String justification,
      BigDecimal justificationFee,
      LocalDate justificationDate,
      PaymentResponse payment) {}

  public record ExcessResponse(
      Long staffId,
      String staffCode,
      String staffName,
      String staffType,
      String positionName,
      List<CourseResponse> courses,
      int absences,
      int maxAbsences,
      LocalDate lastAbsenceDate,
      boolean notified,
      String notificationMessage,
      LocalDate notifiedAt) {}
}
