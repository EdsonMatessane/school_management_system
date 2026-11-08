package mz.cacoin.graduations;

import java.math.BigDecimal;
import java.time.LocalDate;

public record GraduationRegistrationResponse(
    Long id,
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
    int guests,
    BigDecimal feeAmount,
    BigDecimal requirementsAmount,
    BigDecimal extraGuestsAmount,
    BigDecimal amount,
    boolean paid,
    boolean graduated,
    String status,
    LocalDate registrationDate,
    LocalDate graduationDate,
    GraduationRegistrationPaymentResponse payment) {}
