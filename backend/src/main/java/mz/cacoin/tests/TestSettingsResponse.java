package mz.cacoin.tests;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TestSettingsResponse(
    BigDecimal normalFee,
    BigDecimal recoveryFee,
    BigDecimal specialFee,
    boolean normalFeeActive,
    boolean recoveryFeeActive,
    boolean specialFeeActive,
    LocalDateTime testPeriodStart,
    LocalDateTime testPeriodEnd,
    LocalDateTime gradeReleaseStart,
    LocalDateTime gradeReleaseEnd) {}
