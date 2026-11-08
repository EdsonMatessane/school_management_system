package mz.cacoin.graduations;

import java.math.BigDecimal;

public record GraduationQuote(
    BigDecimal feeAmount,
    BigDecimal requirementsAmount,
    int extraGuests,
    BigDecimal extraGuestsAmount,
    BigDecimal total) {}
