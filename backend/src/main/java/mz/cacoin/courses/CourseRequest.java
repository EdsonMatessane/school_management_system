package mz.cacoin.courses;

public record CourseRequest(
    String name,
    Integer durationMonths,
    Long categoryId,
    Long levelId,
    Boolean noLevel,
    Long modalityId,
    Long monthlyFeeId,
    Long enrollmentFeeId,
    Long manualFeeId) {}
