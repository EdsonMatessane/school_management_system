package mz.cacoin.tests;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TestSettingsRequest(
    BigDecimal normalFee,
    BigDecimal recoveryFee,
    BigDecimal specialFee,
    Boolean normalFeeActive,
    Boolean recoveryFeeActive,
    Boolean specialFeeActive,
    LocalDateTime testPeriodStart,
    LocalDateTime testPeriodEnd,
    LocalDateTime gradeReleaseStart,
    LocalDateTime gradeReleaseEnd) {}
