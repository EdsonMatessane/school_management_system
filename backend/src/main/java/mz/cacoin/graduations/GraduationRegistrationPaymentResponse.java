package mz.cacoin.graduations;

import java.math.BigDecimal;
import java.time.LocalDate;

public record GraduationRegistrationPaymentResponse(
    Long id, BigDecimal amount, LocalDate paymentDate, String method, String reference) {}
