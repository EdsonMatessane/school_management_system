package mz.cacoin.attendances;

import java.time.LocalDate;

public record AttendanceExcessResponse(
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
    Integer durationMonths,
    int absences,
    int maxAbsences,
    LocalDate lastAbsenceDate,
    String teacherName,
    boolean notified,
    String notificationMessage,
    LocalDate notifiedAt) {}
