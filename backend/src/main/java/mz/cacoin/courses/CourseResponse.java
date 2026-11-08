package mz.cacoin.courses;

import java.math.BigDecimal;

public record CourseResponse(
    Long id,
    String name,
    Integer durationMonths,
    Long categoryId,
    String categoryName,
    Long levelId,
    String levelName,
    Long modalityId,
    String modalityName,
    Long monthlyFeeId,
    String monthlyFeeType,
    BigDecimal monthlyFeeAmount,
    Long enrollmentFeeId,
    String enrollmentFeeType,
    BigDecimal enrollmentFeeAmount,
    Long manualFeeId,
    String manualFeeType,
    BigDecimal manualFeeAmount,
    boolean active) {}
