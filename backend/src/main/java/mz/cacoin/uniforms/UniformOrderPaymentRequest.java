package mz.cacoin.uniforms;

import java.time.LocalDate;

public record UniformOrderPaymentRequest(LocalDate paymentDate, String method, String reference) {}
