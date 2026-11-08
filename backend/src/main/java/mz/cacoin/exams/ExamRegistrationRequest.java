package mz.cacoin.exams;

public record ExamRegistrationRequest(
    Long studentId,
    Long courseId,
    String examType) {}
