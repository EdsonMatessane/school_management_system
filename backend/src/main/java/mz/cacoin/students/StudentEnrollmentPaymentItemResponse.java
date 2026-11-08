package mz.cacoin.students;

import java.math.BigDecimal;
import java.util.List;

public record StudentEnrollmentPaymentItemResponse(
    Long chargeId,
    String feeType,
    String label,
    String type,
    BigDecimal amount,
    BigDecimal paidAmount,
    BigDecimal balance,
    List<StudentFeePaymentResponse> payments) {}
