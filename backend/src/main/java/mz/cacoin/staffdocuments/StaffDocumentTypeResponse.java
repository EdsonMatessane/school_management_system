package mz.cacoin.staffdocuments;

public record StaffDocumentTypeResponse(
    Long id, String name, boolean hasValidity, boolean requiresDescription, boolean system) {}
