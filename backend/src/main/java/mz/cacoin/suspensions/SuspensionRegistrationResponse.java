package mz.cacoin.suspensions;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SuspensionRegistrationResponse(
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
    BigDecimal amount,
    LocalDate suspensionDate,
    boolean paid,
    boolean suspended,
    String status,
    SuspensionRegistrationPaymentResponse payment) {}
