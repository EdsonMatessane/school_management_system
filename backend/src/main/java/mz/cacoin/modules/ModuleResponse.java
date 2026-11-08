package mz.cacoin.modules;

public record ModuleResponse(
    Long id,
    Long courseId,
    String courseName,
    Integer moduleNumber,
    String name,
    String details,
    boolean active) {}
