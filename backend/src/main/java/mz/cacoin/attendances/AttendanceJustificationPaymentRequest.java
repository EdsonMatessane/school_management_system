package mz.cacoin.attendances;

import java.time.LocalDate;

public record AttendanceJustificationPaymentRequest(
    LocalDate paymentDate, String method, String reference) {}
