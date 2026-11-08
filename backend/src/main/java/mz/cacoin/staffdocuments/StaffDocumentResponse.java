package mz.cacoin.staffdocuments;

import java.time.LocalDate;

public record StaffDocumentResponse(
    Long id,
    Long staffId,
    Long typeId,
    String typeName,
    boolean hasValidity,
    String description,
    LocalDate issueDate,
    LocalDate expiryDate) {}
