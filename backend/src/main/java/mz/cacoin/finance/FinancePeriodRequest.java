package mz.cacoin.finance;

import java.time.LocalDateTime;

public record FinancePeriodRequest(LocalDateTime periodStart, LocalDateTime periodEnd) {}
