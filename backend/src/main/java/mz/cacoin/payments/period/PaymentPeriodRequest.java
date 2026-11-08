package mz.cacoin.payments.period;

public record PaymentPeriodRequest(
    Integer dueDay,
    Integer graceDays,
    String nonBusinessAdjustment,
    Boolean saturdayNonBusiness,
    Boolean sundayNonBusiness,
    Boolean holidaysNonBusiness,
    String firstMonthPolicy) {}
