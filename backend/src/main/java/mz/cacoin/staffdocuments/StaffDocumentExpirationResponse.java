package mz.cacoin.staffdocuments;

import java.time.LocalDate;

public record StaffDocumentExpirationResponse(
    Long documentId,
    Long staffId,
    String staffCode,
    String staffName,
    String phone,
    String biNumber,
    String typeName,
    String description,
    LocalDate issueDate,
    LocalDate expiryDate,
    long days) {}
