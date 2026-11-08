package mz.cacoin.students.tests;

import java.math.BigDecimal;

public record StudentTestGradeResponse(
    Long id,
    Long testId,
    Long studentId,
    String studentCode,
    String studentName,
    BigDecimal grade,
    boolean absent,
    String observations) {}
