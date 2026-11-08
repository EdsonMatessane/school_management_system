package mz.cacoin.suspensions;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SuspensionRegistrationPaymentResponse(
    Long id, BigDecimal amount, LocalDate paymentDate, String method, String reference) {}
