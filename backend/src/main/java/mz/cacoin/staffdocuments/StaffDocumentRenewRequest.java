package mz.cacoin.staffdocuments;

import java.time.LocalDate;

public record StaffDocumentRenewRequest(LocalDate issueDate, LocalDate expiryDate) {}
