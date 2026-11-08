package mz.cacoin.payments.period;

public record PaymentPeriodResponse(
    Long id,
    int dueDay,
    int graceDays,
    String nonBusinessAdjustment,
    boolean saturdayNonBusiness,
    boolean sundayNonBusiness,
    boolean holidaysNonBusiness,
    String firstMonthPolicy) {}
