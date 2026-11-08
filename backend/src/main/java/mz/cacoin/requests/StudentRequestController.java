package mz.cacoin.requests;

import java.io.IOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/requests")
@RequiredArgsConstructor
public class StudentRequestController {
  private final StudentRequestService requests;

  @GetMapping
  public List<StudentRequestDtos.Response> list() {
    return requests.list();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public StudentRequestDtos.Response create(
      @RequestPart("request") StudentRequestDtos.Request request,
      @RequestPart(value = "files", required = false) List<MultipartFile> files) {
    return requests.create(request, files);
  }

  @PostMapping("/{id}/approval")
  public StudentRequestDtos.Response approve(@PathVariable Long id) {
    return requests.approve(id);
  }

  @PostMapping("/{id}/rejection")
  public StudentRequestDtos.Response reject(
      @PathVariable Long id, @RequestBody StudentRequestDtos.RejectionRequest request) {
    return requests.reject(id, request);
  }

  @PostMapping("/{id}/completion")
  public StudentRequestDtos.Response complete(@PathVariable Long id) {
    return requests.complete(id);
  }

  @GetMapping("/attachments/{id}")
  public ResponseEntity<Resource> downloadAttachment(@PathVariable Long id) throws IOException {
    StudentRequestService.AttachmentFile file = requests.getAttachment(id);
    Resource resource = new FileSystemResource(file.path());
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(file.contentType()))
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.attachment().filename(file.fileName()).build().toString())
        .body(resource);
  }
}
