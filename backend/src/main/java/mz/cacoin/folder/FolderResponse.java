package mz.cacoin.folder;

import java.time.Instant;

/**
 * {@code fileCount} inclui os ficheiros das subpastas; {@code hasContent} indica se a pasta
 * tem subpastas ou ficheiros (por exemplo, para permitir comprimir em zip).
 */
public record FolderResponse(
    Long id,
    String name,
    Long parentId,
    boolean hasContent,
    int fileCount,
    String createdBy,
    String createdByCode,
    Instant createdAt) {}
