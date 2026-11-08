package mz.cacoin.attendances;

import java.math.BigDecimal;
import java.time.LocalDate;

public record AttendanceRecordResponse(
    Long id,
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
    Long teacherId,
    String teacherName,
    LocalDate date,
    String status,
    String justification,
    BigDecimal justificationFee,
    LocalDate justificationDate,
    AttendanceJustificationPaymentResponse payment) {}
