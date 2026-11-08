package mz.cacoin.exams;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record ExamRegistrationResponse(
    Long id,
    String examType,
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
    BigDecimal amount,
    BigDecimal paidAmount,
    BigDecimal balance,
    String status,
    LocalDate registrationDate,
    List<ExamRegistrationPaymentResponse> payments) {}
