package mz.cacoin.courses.enrollmentfees;

import java.math.BigDecimal;

public record EnrollmentFeeResponse(
    Long id, String type, String description, BigDecimal amount, boolean active) {}
