package mz.cacoin.tests;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TestRegistrationPaymentResponse(
    Long id,
    BigDecimal amount,
    LocalDate paymentDate,
    String method,
    String reference) {}
