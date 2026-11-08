package mz.cacoin.finance;

import java.math.BigDecimal;

public record FinanceDashboardResponse(
    int registered,
    BigDecimal monthlyPayroll,
    int paid,
    int bonused,
    int pending,
    int advancedMonths,
    BigDecimal paidThisMonth,
    BigDecimal bonusThisMonth,
    BigDecimal paidThisYear,
    int employeesInDebt,
    BigDecimal totalDebt) {}
