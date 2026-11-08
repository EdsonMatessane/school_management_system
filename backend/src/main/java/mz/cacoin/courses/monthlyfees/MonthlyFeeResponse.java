package mz.cacoin.courses.monthlyfees;

import java.math.BigDecimal;

public record MonthlyFeeResponse(
    Long id, String type, String description, BigDecimal amount, boolean active) {}
