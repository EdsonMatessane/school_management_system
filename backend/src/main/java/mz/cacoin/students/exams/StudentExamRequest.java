package mz.cacoin.students.exams;

import java.math.BigDecimal;

public record StudentExamRequest(
    Long courseId, Long moduleId, Long disciplineId, String name, BigDecimal maxGrade) {}
