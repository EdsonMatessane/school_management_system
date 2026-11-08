package mz.cacoin.tests;

public record TestRegistrationRequest(
    Long studentId,
    Long courseId,
    String testType) {}
