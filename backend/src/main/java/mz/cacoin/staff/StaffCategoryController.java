package mz.cacoin.staff;

import java.io.IOException;
import java.util.List;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

public abstract class StaffCategoryController {
  private final StaffService staff;
  private final String staffType;

  protected StaffCategoryController(StaffService staff, String staffType) {
    this.staff = staff;
    this.staffType = staffType;
  }

  @GetMapping
  public List<StaffResponse> list() {
    return staff.list(staffType);
  }

  @GetMapping("/{id}/courses")
  public List<StaffCourseAssignmentResponse> listCourses(@PathVariable Long id) {
    return staff.listCourses(staffType, id);
  }

  @PostMapping("/{id}/courses")
  @ResponseStatus(HttpStatus.CREATED)
  public StaffCourseAssignmentResponse addCourse(
      @PathVariable Long id, @RequestBody StaffCourseAssignmentRequest request) {
    return staff.addCourse(staffType, id, request);
  }

  @PatchMapping("/{id}/courses/{assignmentId}/activation")
  public StaffCourseAssignmentResponse setCourseActive(
      @PathVariable Long id,
      @PathVariable Long assignmentId,
      @RequestBody StaffCourseAssignmentActivationRequest request) {
    if (request == null || request.active() == null) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "O estado da associação é obrigatório");
    }
    return staff.setCourseActive(staffType, id, assignmentId, request.active());
  }

  @DeleteMapping("/{id}/courses/{assignmentId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void removeCourse(@PathVariable Long id, @PathVariable Long assignmentId) {
    staff.removeCourse(staffType, id, assignmentId);
  }

  @PostMapping("/enrollments")
  @ResponseStatus(HttpStatus.CREATED)
  public StaffResponse enroll(
      @RequestPart("staff") StaffRequest request,
      @RequestPart(value = "certificate", required = false) MultipartFile certificate,
      @RequestPart(value = "cv", required = false) MultipartFile cv) {
    return staff.enroll(staffType, request, certificate, cv);
  }

  @PutMapping("/{id}")
  public StaffResponse update(
      @PathVariable Long id,
      @RequestPart("staff") StaffRequest request,
      @RequestPart(value = "certificate", required = false) MultipartFile certificate,
      @RequestPart(value = "cv", required = false) MultipartFile cv) {
    return staff.update(staffType, id, request, certificate, cv);
  }

  @PatchMapping("/{id}/activation")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void setActive(
      @PathVariable Long id, @RequestBody StaffActivationRequest request) {
    if (request == null || request.active() == null) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "O estado de ativação é obrigatório");
    }
    staff.setActive(staffType, id, request.active());
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Long id) {
    staff.delete(staffType, id);
  }

  @GetMapping("/{id}/documents/{kind}")
  public ResponseEntity<Resource> downloadDocument(
      @PathVariable Long id, @PathVariable String kind) throws IOException {
    StaffDocument document = staff.getDocument(staffType, id, kind);
    Resource resource = new FileSystemResource(document.path());
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(document.contentType()))
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.attachment().filename(document.fileName()).build().toString())
        .body(resource);
  }
}
