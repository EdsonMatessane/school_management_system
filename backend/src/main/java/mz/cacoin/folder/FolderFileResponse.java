package mz.cacoin.folder;

import java.time.Instant;

public record FolderFileResponse(
    Long id,
    String name,
    long size,
    String contentType,
    String addedBy,
    String addedByCode,
    Instant addedAt) {}
