package mz.cacoin.graduations;

import java.time.LocalDateTime;

public record GraduationPeriodRequest(LocalDateTime periodStart, LocalDateTime periodEnd) {}
