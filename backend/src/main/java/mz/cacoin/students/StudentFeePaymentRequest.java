package mz.cacoin.students;

import java.math.BigDecimal;
import java.time.LocalDate;

public record StudentFeePaymentRequest(
    BigDecimal amount,
    LocalDate paymentDate,
    String method,
    String reference) {}
