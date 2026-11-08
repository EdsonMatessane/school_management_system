package mz.cacoin.students;

public record StudentEnrollmentResponse(
    Long enrollmentId,
    String studentCode,
    String studentName,
    String courseName) {}
