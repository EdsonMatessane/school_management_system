package mz.cacoin.finance;

import java.math.BigDecimal;

public record SalaryRegistrationRequest(
    Long staffId,
    Long positionId,
    Long salaryTypeId,
    BigDecimal salary,
    Long bonusTypeId,
    BigDecimal bonus,
    String observation,
    String bankName,
    String nib) {}
