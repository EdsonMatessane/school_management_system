package mz.cacoin.payments.period;

import java.time.LocalDate;

public record PaymentPeriodPreviewItem(
    String periodLabel,
    LocalDate referenceDate,
    LocalDate dueDate,
    LocalDate overdueFrom,
    String note) {}
