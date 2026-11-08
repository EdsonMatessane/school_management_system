package mz.cacoin.students;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record StudentFeeChargeResponse(
    Long id,
    Long studentId,
    String studentCode,
    String studentName,
    String courseName,
    Long enrollmentId,
    String phone,
    String email,
    String categoryName,
    String levelName,
    String modalityName,
    Integer durationMonths,
    LocalDate enrollmentDate,
    String feeType,
    String description,
    String periodLabel,
    BigDecimal amount,
    BigDecimal fineAmount,
    BigDecimal finePercent,
    BigDecimal paidAmount,
    BigDecimal balance,
    LocalDate dueDate,
    String status,
    List<StudentFeePaymentResponse> payments) {}
