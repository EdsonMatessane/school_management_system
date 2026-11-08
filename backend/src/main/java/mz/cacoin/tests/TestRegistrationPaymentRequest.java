package mz.cacoin.tests;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TestRegistrationPaymentRequest(
    BigDecimal amount,
    LocalDate paymentDate,
    String method,
    String reference) {}
