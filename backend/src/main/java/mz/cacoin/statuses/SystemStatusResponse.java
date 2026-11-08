package mz.cacoin.statuses;

public record SystemStatusResponse(
    Long id,
    String module,
    String code,
    String label,
    String tone,
    Integer sortOrder,
    boolean active,
    boolean systemDefined) {}
