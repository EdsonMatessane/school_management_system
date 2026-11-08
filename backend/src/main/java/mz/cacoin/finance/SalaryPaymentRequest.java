package mz.cacoin.finance;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SalaryPaymentRequest(
    Long staffId, LocalDate month, BigDecimal amount, String observation) {}
