package mz.cacoin.finance;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record FinanceReportRowResponse(
    Long staffId,
    String staffCode,
    String staffName,
    String phone,
    String biNumber,
    String nuit,
    String positionName,
    String salaryTypeName,
    LocalDate month,
    String status,
    String kind,
    BigDecimal salary,
    BigDecimal paidAmount,
    BigDecimal bonus,
    BigDecimal discountedBalance,
    BigDecimal owed,
    LocalDateTime processedAt,
    String observation) {}
