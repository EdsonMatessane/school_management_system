package mz.cacoin.folder;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import lombok.RequiredArgsConstructor;
import mz.cacoin.audit.AuditContext;
import mz.cacoin.common.TextNormalizer;
import mz.cacoin.users.UserAccountRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class FolderService {
  private static final Pattern ID_PREFIX = Pattern.compile("^\\d+-");

  private final FolderRepository folders;
  private final FolderFileRepository files;
  private final UserAccountRepository accounts;

  @Value("${cacoin.storage.folder-root:./data/cacoin-folders}")
  private Path storageRoot;

  /** Pasta (sub-árvore) pronta a comprimir; não depende da base de dados durante a escrita. */
  public record ZipSource(String rootName, Path path) {}

  /** Ficheiro pronto a servir. */
  public record FileDownload(Path path, String name, String contentType) {}

  private record Actor(Long id, String code, String name) {}

  @Transactional(readOnly = true)
  public List<FolderResponse> list() {
    return responses();
  }

  private List<FolderResponse> responses() {
    List<Folder> all = folders.findAllByOrderByNameAsc();
    Map<Long, Folder> byId = new HashMap<>();
    Set<Long> withChildren = new HashSet<>();
    for (Folder folder : all) {
      byId.put(folder.getId(), folder);
      if (folder.getParent() != null) {
        withChildren.add(folder.getParent().getId());
      }
    }
    // ficheiros por pasta, somados também a todas as pastas acima
    Map<Long, Integer> totals = new HashMap<>();
    for (Object[] row : files.countByFolder()) {
      int count = ((Number) row[1]).intValue();
      for (Folder current = byId.get((Long) row[0]); current != null;
          current = current.getParent() == null ? null : byId.get(current.getParent().getId())) {
        totals.merge(current.getId(), count, Integer::sum);
      }
    }
    Set<Path> withFiles = directoriesWithFiles();
    return all.stream()
        .map(folder -> new FolderResponse(
            folder.getId(),
            TextNormalizer.toDisplay(folder.getName()),
            folder.getParent() == null ? null : folder.getParent().getId(),
            withChildren.contains(folder.getId()) || withFiles.contains(folderPath(folder)),
            totals.getOrDefault(folder.getId(), 0),
            folder.getCreatedByName(),
            folder.getCreatedByCode(),
            folder.getCreatedAt()))
        .toList();
  }

  private FolderResponse responseFor(Folder folder) {
    return responses().stream()
        .filter(item -> item.id().equals(folder.getId()))
        .findFirst()
        .orElseThrow();
  }

  @Transactional
  public FolderResponse create(FolderRequest request) {
    if (request == null || request.name() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indique um nome para a pasta");
    }
    String name = validName(request.name());

    Folder parent = request.parentId() == null
        ? null
        : folders.findById(request.parentId())
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "A pasta principal não foi encontrada"));
    boolean duplicate = parent == null
        ? folders.existsByParentIsNullAndNameIgnoreCase(name)
        : folders.existsByParentIdAndNameIgnoreCase(parent.getId(), name);
    if (duplicate) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Já existe uma pasta com esse nome neste nível");
    }

    Folder folder = new Folder();
    Actor actor = currentActor();
    folder.setParent(parent);
    folder.setName(name);
    folder.setCreatedById(actor.id());
    folder.setCreatedByCode(actor.code());
    folder.setCreatedByName(actor.name());
    folder.setCreatedAt(Instant.now());
    folder = folders.saveAndFlush(folder);
    try {
      Files.createDirectories(folderPath(folder));
    } catch (IOException exception) {
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR,
          "Não foi possível criar a pasta no armazenamento",
          exception);
    }
    return responseFor(folder);
  }

  @Transactional
  public FolderResponse rename(Long id, FolderRenameRequest request) {
    if (request == null || request.name() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indique um nome para a pasta");
    }
    Folder folder = find(id);
    String name = validName(request.name());
    if (name.equals(folder.getName())) {
      return responseFor(folder);
    }
    boolean duplicate = folder.getParent() == null
        ? folders.existsByParentIsNullAndNameIgnoreCaseAndIdNot(name, id)
        : folders.existsByParentIdAndNameIgnoreCaseAndIdNot(folder.getParent().getId(), name, id);
    if (duplicate) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Já existe uma pasta com esse nome neste nível");
    }

    Path from = folderPath(folder);
    folder.setName(name);
    folders.saveAndFlush(folder);
    relocate(from, folderPath(folder));
    return responseFor(folder);
  }

  @Transactional
  public FolderResponse move(Long id, FolderMoveRequest request) {
    Folder folder = find(id);
    Long targetId = request == null ? null : request.parentId();
    Long currentId = folder.getParent() == null ? null : folder.getParent().getId();
    if ((targetId == null && currentId == null)
        || (targetId != null && targetId.equals(currentId))) {
      return responseFor(folder);
    }

    Folder target = null;
    if (targetId != null) {
      target = folders.findById(targetId)
          .orElseThrow(() -> new ResponseStatusException(
              HttpStatus.NOT_FOUND, "A pasta de destino não foi encontrada"));
      for (Folder ancestor = target; ancestor != null; ancestor = ancestor.getParent()) {
        if (ancestor.getId().equals(folder.getId())) {
          throw new ResponseStatusException(
              HttpStatus.BAD_REQUEST, "Não é possível mover uma pasta para dentro dela própria");
        }
      }
    }
    boolean duplicate = target == null
        ? folders.existsByParentIsNullAndNameIgnoreCaseAndIdNot(folder.getName(), id)
        : folders.existsByParentIdAndNameIgnoreCaseAndIdNot(target.getId(), folder.getName(), id);
    if (duplicate) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Já existe uma pasta com esse nome no destino");
    }

    Path from = folderPath(folder);
    folder.setParent(target);
    folders.saveAndFlush(folder);
    relocate(from, folderPath(folder));
    return responseFor(folder);
  }

  @Transactional
  public void delete(Long id, boolean cascade) {
    Folder folder = find(id);
    Path path = folderPath(folder);

    Map<Long, List<Folder>> childrenByParent = new HashMap<>();
    for (Folder item : folders.findAll()) {
      if (item.getParent() != null) {
        childrenByParent.computeIfAbsent(item.getParent().getId(), key -> new ArrayList<>())
            .add(item);
      }
    }
    boolean hasChildren = childrenByParent.containsKey(folder.getId());
    if (!cascade && (hasChildren || directoriesWithFiles().contains(path))) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "A pasta tem conteúdo. Confirme para apagar a pasta e todo o conteúdo");
    }

    List<Folder> postOrder = new ArrayList<>();
    collectPostOrder(folder, childrenByParent, postOrder);
    files.deleteAllByFolderIdIn(postOrder.stream().map(Folder::getId).toList());
    folders.deleteAll(postOrder);
    folders.flush();
    deleteTree(path);
  }

  @Transactional(readOnly = true)
  public ZipSource zipSource(Long id) {
    Folder folder = find(id);
    Path path = folderPath(folder);
    boolean hasChildren = folders.findAll().stream()
        .anyMatch(item -> item.getParent() != null && item.getParent().getId().equals(id));
    if (!Files.isDirectory(path) || (!hasChildren && !directoriesWithFiles().contains(path))) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Esta pasta não tem conteúdo para comprimir");
    }
    return new ZipSource(folder.getName(), path);
  }

  public void writeZip(ZipSource source, OutputStream output) throws IOException {
    Path base = source.path();
    try (ZipOutputStream zip = new ZipOutputStream(output, StandardCharsets.UTF_8)) {
      zip.putNextEntry(new ZipEntry(source.rootName() + "/"));
      zip.closeEntry();
      Files.walkFileTree(base, new SimpleFileVisitor<>() {
        @Override
        public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attributes)
            throws IOException {
          if (!dir.equals(base)) {
            zip.putNextEntry(new ZipEntry(entryName(source, base, dir, true)));
            zip.closeEntry();
          }
          return FileVisitResult.CONTINUE;
        }

        @Override
        public FileVisitResult visitFile(Path file, BasicFileAttributes attributes)
            throws IOException {
          if (attributes.isRegularFile()) {
            zip.putNextEntry(new ZipEntry(entryName(source, base, file, false)));
            Files.copy(file, zip);
            zip.closeEntry();
          }
          return FileVisitResult.CONTINUE;
        }
      });
    }
  }

  private String entryName(ZipSource source, Path base, Path path, boolean directory) {
    Path relative = base.relativize(path);
    List<String> segments = new ArrayList<>();
    for (int index = 0; index < relative.getNameCount(); index++) {
      String segment = relative.getName(index).toString();
      boolean folderSegment = directory || index < relative.getNameCount() - 1;
      segments.add(folderSegment ? ID_PREFIX.matcher(segment).replaceFirst("") : segment);
    }
    return source.rootName() + "/" + String.join("/", segments) + (directory ? "/" : "");
  }

  private void collectPostOrder(
      Folder folder, Map<Long, List<Folder>> childrenByParent, List<Folder> result) {
    for (Folder child : childrenByParent.getOrDefault(folder.getId(), List.of())) {
      collectPostOrder(child, childrenByParent, result);
    }
    result.add(folder);
  }

  private Folder find(Long id) {
    return folders.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "A pasta não foi encontrada"));
  }

  private String validName(String rawName) {
    String name = TextNormalizer.normalize(rawName).trim();
    if (name.isEmpty() || name.length() > 120 || !isSafeFolderName(name)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Indique um nome de pasta válido até 120 caracteres");
    }
    return name;
  }

  private Path root() {
    return storageRoot.toAbsolutePath().normalize();
  }

  private Path folderPath(Folder folder) {
    Path path = folder.getParent() == null ? root() : folderPath(folder.getParent());
    return path.resolve(folder.getId() + "-" + folder.getName()).normalize();
  }

  /** Move (ou cria) a pasta no armazenamento; os descendentes seguem dentro dela. */
  private void relocate(Path from, Path to) {
    try {
      Files.createDirectories(to.getParent());
      if (Files.exists(from)) {
        if (!from.equals(to)) {
          Files.move(from, to);
        }
      } else {
        Files.createDirectories(to);
      }
    } catch (IOException exception) {
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR,
          "Não foi possível actualizar a pasta no armazenamento",
          exception);
    }
  }

  private void deleteTree(Path path) {
    if (!Files.exists(path)) {
      return;
    }
    try (Stream<Path> walk = Files.walk(path)) {
      List<Path> ordered = walk.sorted(Comparator.reverseOrder()).toList();
      for (Path item : ordered) {
        Files.delete(item);
      }
    } catch (IOException exception) {
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR,
          "Não foi possível apagar a pasta do armazenamento",
          exception);
    }
  }

  /** Todas as pastas do armazenamento que têm pelo menos um ficheiro (directo ou em subpastas). */
  private Set<Path> directoriesWithFiles() {
    Set<Path> result = new HashSet<>();
    Path root = root();
    if (!Files.isDirectory(root)) {
      return result;
    }
    try (Stream<Path> walk = Files.walk(root)) {
      walk.filter(Files::isRegularFile).forEach(file -> {
        for (Path dir = file.getParent(); dir != null && dir.startsWith(root); dir = dir.getParent()) {
          if (!result.add(dir)) {
            break;
          }
        }
      });
    } catch (IOException exception) {
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR,
          "Não foi possível ler o armazenamento das pastas",
          exception);
    }
    return result;
  }

  private boolean isSafeFolderName(String name) {
    return !name.equals(".")
        && !name.equals("..")
        && !name.endsWith(".")
        && !name.endsWith(" ")
        && name.chars().noneMatch(character ->
            character < 32 || "<>:\"/\\|?*".indexOf(character) >= 0);
  }

  // ---- ficheiros ----

  @Transactional(readOnly = true)
  public List<FolderFileResponse> listFiles(Long folderId) {
    find(folderId);
    return files.findAllByFolderIdOrderByNameAsc(folderId).stream().map(this::toFileResponse).toList();
  }

  @Transactional
  public List<FolderFileResponse> upload(Long folderId, List<MultipartFile> uploads) {
    Folder folder = find(folderId);
    if (uploads == null || uploads.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seleccione pelo menos um ficheiro");
    }
    Actor actor = currentActor();
    Path directory = folderPath(folder);
    List<Path> written = new ArrayList<>();
    List<FolderFile> saved = new ArrayList<>();
    try {
      Files.createDirectories(directory);
      for (MultipartFile upload : uploads) {
        String name = validFileName(upload.getOriginalFilename());
        Path target = directory.resolve(name).normalize();
        if (!directory.equals(target.getParent())) {
          throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nome de ficheiro inválido");
        }
        if (files.existsByFolderIdAndNameIgnoreCase(folderId, name) || Files.exists(target)) {
          throw new ResponseStatusException(
              HttpStatus.CONFLICT, "Já existe um ficheiro chamado \"" + name + "\" nesta pasta");
        }
        try (var input = upload.getInputStream()) {
          Files.copy(input, target);
        }
        written.add(target);

        FolderFile file = new FolderFile();
        file.setFolder(folder);
        file.setName(name);
        file.setSize(upload.getSize());
        file.setContentType(upload.getContentType());
        file.setAddedById(actor.id());
        file.setAddedByCode(actor.code());
        file.setAddedByName(actor.name());
        file.setAddedAt(Instant.now());
        saved.add(files.save(file));
      }
    } catch (IOException | RuntimeException exception) {
      written.forEach(path -> path.toFile().delete());
      if (exception instanceof RuntimeException runtime) {
        throw runtime;
      }
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR,
          "Não foi possível guardar o ficheiro no armazenamento",
          exception);
    }
    return saved.stream().map(this::toFileResponse).toList();
  }

  @Transactional(readOnly = true)
  public FileDownload file(Long folderId, Long fileId) {
    FolderFile file = files.findByIdAndFolderId(fileId, folderId)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O ficheiro não foi encontrado"));
    Path path = folderPath(file.getFolder()).resolve(file.getName()).normalize();
    if (!Files.isRegularFile(path)) {
      throw new ResponseStatusException(
          HttpStatus.NOT_FOUND, "O ficheiro não foi encontrado no armazenamento");
    }
    return new FileDownload(path, file.getName(), file.getContentType());
  }

  @Transactional
  public void deleteFile(Long folderId, Long fileId) {
    FolderFile file = files.findByIdAndFolderId(fileId, folderId)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O ficheiro não foi encontrado"));
    Path path = folderPath(file.getFolder()).resolve(file.getName()).normalize();
    files.delete(file);
    files.flush();
    try {
      Files.deleteIfExists(path);
    } catch (IOException exception) {
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR,
          "Não foi possível apagar o ficheiro do armazenamento",
          exception);
    }
  }

  private String validFileName(String original) {
    String name = original == null ? "" : original.replace('\\', '/');
    name = name.substring(name.lastIndexOf('/') + 1).trim();
    if (name.isEmpty()
        || name.length() > 200
        || name.equals(".")
        || name.equals("..")
        || name.endsWith(".")
        || name.chars().anyMatch(character -> character < 32 || "<>:\"|?*".indexOf(character) >= 0)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nome de ficheiro inválido");
    }
    return name;
  }

  private FolderFileResponse toFileResponse(FolderFile file) {
    return new FolderFileResponse(
        file.getId(),
        file.getName(),
        file.getSize(),
        file.getContentType(),
        file.getAddedByName(),
        file.getAddedByCode(),
        file.getAddedAt());
  }

  /** Quem está a fazer o pedido; sem sessão obrigatória fica "Sistema". */
  private Actor currentActor() {
    AuditContext.Actor actor = AuditContext.current();
    if (actor == null) {
      return new Actor(null, null, "Sistema");
    }
    String name = accounts.findById(actor.accountId())
        .map(account -> ((account.getFirstName() == null ? "" : account.getFirstName()) + " "
            + (account.getSurname() == null ? "" : account.getSurname())).trim())
        .filter(value -> !value.isEmpty())
        .orElse(actor.code());
    return new Actor(actor.accountId(), actor.code(), name);
  }
}
