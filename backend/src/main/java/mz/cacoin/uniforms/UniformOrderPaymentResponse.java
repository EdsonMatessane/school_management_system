package mz.cacoin.uniforms;

import java.math.BigDecimal;
import java.time.LocalDate;

public record UniformOrderPaymentResponse(
    Long id, BigDecimal amount, LocalDate paymentDate, String method, String reference) {}
