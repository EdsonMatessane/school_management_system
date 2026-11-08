package mz.cacoin.graduations;

import java.time.LocalDate;

public record GraduationRegistrationPaymentRequest(
    LocalDate paymentDate, String method, String reference) {}
