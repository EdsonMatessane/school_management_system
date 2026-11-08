package mz.cacoin.staffdocuments;

import java.time.LocalDate;

public record StaffDocumentRequest(
    Long typeId, String description, LocalDate issueDate, LocalDate expiryDate) {}
