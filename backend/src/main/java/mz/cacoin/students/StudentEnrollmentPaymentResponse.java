package mz.cacoin.students;

import java.math.BigDecimal;
import java.time.LocalDate;

public record StudentEnrollmentPaymentResponse(
    Long enrollmentId,
    Long studentId,
    String studentCode,
    String studentName,
    String phone,
    String email,
    String courseName,
    String categoryName,
    String levelName,
    String modalityName,
    Integer durationMonths,
    LocalDate enrollmentDate,
    StudentEnrollmentPaymentItemResponse firstMonthly,
    StudentEnrollmentPaymentItemResponse enrollmentFee,
    StudentEnrollmentPaymentItemResponse manualFee,
    BigDecimal totalAmount,
    BigDecimal paidAmount,
    BigDecimal balance,
    String status) {}
