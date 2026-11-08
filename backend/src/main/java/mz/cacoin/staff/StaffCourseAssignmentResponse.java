package mz.cacoin.staff;

public record StaffCourseAssignmentResponse(
    Long id,
    Long courseId,
    String courseName,
    String categoryName,
    String levelName,
    String modalityName,
    Integer durationMonths,
    boolean active) {}
