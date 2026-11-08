package mz.cacoin.students;

import java.math.BigDecimal;

public record StudentFeePaymentLineRequest(Long chargeId, BigDecimal amount) {}
