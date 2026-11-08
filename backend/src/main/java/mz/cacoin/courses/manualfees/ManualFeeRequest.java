package mz.cacoin.courses.manualfees;

import java.math.BigDecimal;

public record ManualFeeRequest(String type, String description, BigDecimal amount) {}
