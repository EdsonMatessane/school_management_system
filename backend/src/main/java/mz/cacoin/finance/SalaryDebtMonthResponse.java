package mz.cacoin.finance;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SalaryDebtMonthResponse(LocalDate month, BigDecimal owed, boolean partial) {}
