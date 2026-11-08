package mz.cacoin.modules;

public record ModuleSummaryResponse(
    Long id,
    Long courseId,
    String courseName,
    Integer moduleNumber,
    String name,
    boolean active) {}
