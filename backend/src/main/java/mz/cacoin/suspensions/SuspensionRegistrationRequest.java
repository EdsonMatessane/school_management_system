package mz.cacoin.suspensions;

import java.time.LocalDate;

public record SuspensionRegistrationRequest(
    Long studentId, Long courseId, LocalDate suspensionDate) {}
