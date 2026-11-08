package mz.cacoin.finance;

import java.math.BigDecimal;
import java.util.List;

public record SalaryDebtResponse(
    Long staffId,
    String staffCode,
    String staffName,
    String phone,
    String biNumber,
    String nuit,
    String positionName,
    String salaryTypeName,
    BigDecimal salary,
    String bonusTypeName,
    BigDecimal bonus,
    BigDecimal totalOwed,
    List<SalaryDebtMonthResponse> months) {}
