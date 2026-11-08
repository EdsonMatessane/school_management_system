package mz.cacoin.courses.manualfees;

import java.math.BigDecimal;

public record ManualFeeResponse(
    Long id, String type, String description, BigDecimal amount, boolean active) {}
