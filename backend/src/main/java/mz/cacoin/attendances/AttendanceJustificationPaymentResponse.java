package mz.cacoin.attendances;

import java.math.BigDecimal;
import java.time.LocalDate;

public record AttendanceJustificationPaymentResponse(
    Long id, BigDecimal amount, LocalDate paymentDate, String method, String reference) {}
