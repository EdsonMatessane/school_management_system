package mz.cacoin.students;

import java.math.BigDecimal;
import java.time.LocalDate;

public record StudentFeePaymentResponse(
    Long id,
    BigDecimal amount,
    LocalDate paymentDate,
    String method,
    String reference) {}
