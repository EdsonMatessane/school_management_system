package mz.cacoin.exams;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ExamSettingsResponse(
    BigDecimal normalFee,
    BigDecimal recurrenceFee,
    BigDecimal specialFee,
    boolean normalFeeActive,
    boolean recurrenceFeeActive,
    boolean specialFeeActive,
    LocalDateTime examPeriodStart,
    LocalDateTime examPeriodEnd,
    LocalDateTime gradeReleaseStart,
    LocalDateTime gradeReleaseEnd) {}
