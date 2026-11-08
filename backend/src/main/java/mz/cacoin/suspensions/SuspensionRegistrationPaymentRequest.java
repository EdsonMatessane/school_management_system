package mz.cacoin.suspensions;

import java.time.LocalDate;

public record SuspensionRegistrationPaymentRequest(
    LocalDate paymentDate, String method, String reference) {}
