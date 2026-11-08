package mz.cacoin.assessments;

import java.math.BigDecimal;

public record AssessmentEntryResponse(
    Long studentId,
    String studentCode,
    String studentName,
    BigDecimal grade,
    boolean absent,
    boolean recorded) {}
