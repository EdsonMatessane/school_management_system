package mz.cacoin.exams;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ExamSettingsRequest(
    BigDecimal normalFee,
    BigDecimal recurrenceFee,
    BigDecimal specialFee,
    Boolean normalFeeActive,
    Boolean recurrenceFeeActive,
    Boolean specialFeeActive,
    LocalDateTime examPeriodStart,
    LocalDateTime examPeriodEnd,
    LocalDateTime gradeReleaseStart,
    LocalDateTime gradeReleaseEnd) {}
