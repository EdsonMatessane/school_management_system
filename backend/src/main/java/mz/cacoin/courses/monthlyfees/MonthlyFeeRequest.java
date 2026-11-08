package mz.cacoin.courses.monthlyfees;

import java.math.BigDecimal;

public record MonthlyFeeRequest(String type, String description, BigDecimal amount) {}
