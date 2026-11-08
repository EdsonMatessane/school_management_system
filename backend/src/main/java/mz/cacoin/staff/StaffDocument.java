package mz.cacoin.staff;

import java.nio.file.Path;

public record StaffDocument(Path path, String fileName, String contentType) {}
