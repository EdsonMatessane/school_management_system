package mz.cacoin.uniforms;

import java.math.BigDecimal;
import java.time.LocalDate;

public record UniformOrderResponse(
    Long id,
    String studentCode,
    String studentName,
    Long courseId,
    String courseName,
    Long categoryId,
    String categoryName,
    Long levelId,
    String levelName,
    Long modalityId,
    String modalityName,
    String size,
    BigDecimal amount,
    String observation,
    boolean paid,
    boolean delivered,
    String status,
    LocalDate orderDate,
    LocalDate deliveryDate,
    UniformOrderPaymentResponse payment) {}
