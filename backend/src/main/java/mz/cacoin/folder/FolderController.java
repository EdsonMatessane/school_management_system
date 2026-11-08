package mz.cacoin.folder;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/folders")
@RequiredArgsConstructor
public class FolderController {
  /** Só estes tipos podem abrir no navegador; os restantes são sempre descarregados. */
  private static final Pattern INLINE_TYPES =
      Pattern.compile("^(application/pdf|image/(png|jpeg|gif|webp)|text/plain)$");

  private final FolderService folders;

  @GetMapping
  public List<FolderResponse> list() {
    return folders.list();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public FolderResponse create(@RequestBody FolderRequest request) {
    return folders.create(request);
  }

  @PatchMapping("/{id}")
  public FolderResponse rename(@PathVariable Long id, @RequestBody FolderRenameRequest request) {
    return folders.rename(id, request);
  }

  @PatchMapping("/{id}/parent")
  public FolderResponse move(@PathVariable Long id, @RequestBody FolderMoveRequest request) {
    return folders.move(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Long id, @RequestParam(defaultValue = "false") boolean cascade) {
    folders.delete(id, cascade);
  }

  @GetMapping("/{id}/zip")
  public void zip(@PathVariable Long id, HttpServletResponse response) throws IOException {
    FolderService.ZipSource source = folders.zipSource(id);
    response.setContentType("application/zip");
    response.setHeader(
        HttpHeaders.CONTENT_DISPOSITION,
        ContentDisposition.attachment()
            .filename(source.rootName() + ".zip", StandardCharsets.UTF_8)
            .build()
            .toString());
    folders.writeZip(source, response.getOutputStream());
  }

  @GetMapping("/{id}/files")
  public List<FolderFileResponse> files(@PathVariable Long id) {
    return folders.listFiles(id);
  }

  @PostMapping(path = "/{id}/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @ResponseStatus(HttpStatus.CREATED)
  public List<FolderFileResponse> upload(
      @PathVariable Long id, @RequestParam("files") List<MultipartFile> files) {
    return folders.upload(id, files);
  }

  @GetMapping("/{id}/files/{fileId}")
  public ResponseEntity<Resource> file(
      @PathVariable Long id,
      @PathVariable Long fileId,
      @RequestParam(defaultValue = "false") boolean download) {
    FolderService.FileDownload file = folders.file(id, fileId);
    String contentType = file.contentType() == null || file.contentType().isBlank()
        ? MediaType.APPLICATION_OCTET_STREAM_VALUE
        : file.contentType().toLowerCase();
    boolean inline = !download && INLINE_TYPES.matcher(contentType).matches();
    ContentDisposition disposition = (inline
        ? ContentDisposition.inline()
        : ContentDisposition.attachment())
        .filename(file.name(), StandardCharsets.UTF_8)
        .build();
    return ResponseEntity.ok()
        .contentType(inline
            ? MediaType.parseMediaType(contentType)
            : MediaType.APPLICATION_OCTET_STREAM)
        .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
        .header("X-Content-Type-Options", "nosniff")
        .body(new FileSystemResource(file.path()));
  }

  @DeleteMapping("/{id}/files/{fileId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteFile(@PathVariable Long id, @PathVariable Long fileId) {
    folders.deleteFile(id, fileId);
  }
}
