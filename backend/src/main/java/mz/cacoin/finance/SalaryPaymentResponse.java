package mz.cacoin.finance;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record SalaryPaymentResponse(
    Long id,
    Long staffId,
    String staffCode,
    String staffName,
    String phone,
    String biNumber,
    String nuit,
    String positionName,
    String salaryTypeName,
    String bonusTypeName,
    LocalDate month,
    String kind,
    String status,
    BigDecimal salary,
    BigDecimal paidAmount,
    BigDecimal bonus,
    BigDecimal discountedBalance,
    String observation,
    LocalDateTime processedAt) {}
