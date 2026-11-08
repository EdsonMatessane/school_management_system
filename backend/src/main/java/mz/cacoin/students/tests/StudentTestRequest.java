package mz.cacoin.students.tests;

import java.math.BigDecimal;

public record StudentTestRequest(
    Long courseId, Long moduleId, Long disciplineId, String name, BigDecimal maxGrade) {}
