package mz.cacoin.pautas;

import java.time.LocalDateTime;

public record PautaSettingsResponse(LocalDateTime launchPeriodStart, LocalDateTime launchPeriodEnd) {}
