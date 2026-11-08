package mz.cacoin.graduations;

import java.math.BigDecimal;

public record GraduationSettingsRequest(
    BigDecimal graduationFee,
    Integer includedGuests,
    BigDecimal extraGuestFee,
    BigDecimal specialExamFee) {}
