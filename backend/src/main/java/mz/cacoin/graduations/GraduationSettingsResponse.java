package mz.cacoin.graduations;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

public record GraduationSettingsResponse(
    BigDecimal graduationFee,
    boolean graduationFeeActive,
    int includedGuests,
    BigDecimal extraGuestFee,
    boolean extraGuestFeeActive,
    BigDecimal specialExamFee,
    boolean specialExamFeeActive,
    LocalDateTime periodStart,
    LocalDateTime periodEnd,
    LocalDate ceremonyDate,
    LocalTime ceremonyStartTime,
    LocalTime ceremonyEndTime,
    List<GraduationRequirementResponse> requirements,
    BigDecimal requirementsTotal) {}
