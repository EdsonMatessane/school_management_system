package mz.cacoin.pautas;

import java.time.LocalDateTime;

public record PautaSettingsRequest(LocalDateTime launchPeriodStart, LocalDateTime launchPeriodEnd) {}
