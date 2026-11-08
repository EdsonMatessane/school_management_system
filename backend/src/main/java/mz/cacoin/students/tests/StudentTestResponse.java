package mz.cacoin.students.tests;

import java.math.BigDecimal;

public record StudentTestResponse(
    Long id,
    Long courseId,
    String courseName,
    String categoryName,
    String levelName,
    String modalityName,
    String unitType,
    Long unitId,
    Integer unitNumber,
    String unitName,
    String name,
    BigDecimal maxGrade,
    boolean completed) {}
