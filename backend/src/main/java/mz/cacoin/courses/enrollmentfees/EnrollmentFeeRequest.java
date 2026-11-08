package mz.cacoin.courses.enrollmentfees;

import java.math.BigDecimal;

public record EnrollmentFeeRequest(String type, String description, BigDecimal amount) {}
