package mz.cacoin.finance;

import java.time.LocalDateTime;

public record FinanceSettingsResponse(
    LocalDateTime processingPeriodStart,
    LocalDateTime processingPeriodEnd,
    String paymentRule,
    int maxAdvanceMonths) {}
