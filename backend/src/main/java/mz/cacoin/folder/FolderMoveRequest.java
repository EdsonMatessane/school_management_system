package mz.cacoin.folder;

/** Novo destino da pasta; {@code parentId} nulo significa mover para o nível principal. */
public record FolderMoveRequest(Long parentId) {}
