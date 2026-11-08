package mz.cacoin.students;

import java.time.LocalDate;
import java.util.List;

public record StudentFeeBatchPaymentRequest(
    List<StudentFeePaymentLineRequest> payments,
    LocalDate paymentDate,
    String method,
    String reference) {}
