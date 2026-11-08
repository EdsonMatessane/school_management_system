package mz.cacoin.students.exams;

import java.math.BigDecimal;

public record StudentExamGradeResponse(
    Long id,
    Long examId,
    Long studentId,
    String studentCode,
    String studentName,
    BigDecimal grade,
    boolean absent,
    String observations) {}
