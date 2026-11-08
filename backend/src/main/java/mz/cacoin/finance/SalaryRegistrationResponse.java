package mz.cacoin.finance;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SalaryRegistrationResponse(
    Long id,
    Long staffId,
    String staffCode,
    String staffName,
    String phone,
    String biNumber,
    String nuit,
    Long positionId,
    String positionName,
    Long salaryTypeId,
    String salaryTypeName,
    BigDecimal salary,
    Long bonusTypeId,
    String bonusTypeName,
    BigDecimal bonus,
    LocalDate registrationDate,
    String observation,
    String status,
    LocalDate lastProcessedDate) {}
