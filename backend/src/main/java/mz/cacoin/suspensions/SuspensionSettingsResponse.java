package mz.cacoin.suspensions;

import java.math.BigDecimal;

public record SuspensionSettingsResponse(BigDecimal fee, boolean feeActive) {}
