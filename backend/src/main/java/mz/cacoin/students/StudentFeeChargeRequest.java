package mz.cacoin.students;

import java.time.LocalDate;

public record StudentFeeChargeRequest(
    String feeType,
    String periodLabel,
    LocalDate dueDate) {}
