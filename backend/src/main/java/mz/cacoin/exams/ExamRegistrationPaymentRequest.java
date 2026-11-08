package mz.cacoin.exams;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ExamRegistrationPaymentRequest(
    BigDecimal amount,
    LocalDate paymentDate,
    String method,
    String reference) {}
