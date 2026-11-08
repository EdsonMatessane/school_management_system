package mz.cacoin.modules.disciplines;

public record DisciplineResponse(
    Long id,
    Long courseId,
    String courseName,
    Integer disciplineNumber,
    String name,
    boolean active) {}
