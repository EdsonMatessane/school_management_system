package mz.cacoin.portal;

import java.util.List;
import lombok.RequiredArgsConstructor;
import mz.cacoin.requests.StudentRequestDtos;
import mz.cacoin.requests.StudentRequestService;
import mz.cacoin.users.AuthFilter;
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
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/portal")
@RequiredArgsConstructor
public class PortalController {
  private final PortalService portal;

  @GetMapping("/overview")
  public PortalDtos.Overview overview(@RequestAttribute(AuthFilter.PORTAL_STUDENT) Long studentId) {
    return portal.overview(studentId);
  }

  @GetMapping("/profile")
  public PortalDtos.Profile profile(@RequestAttribute(AuthFilter.PORTAL_STUDENT) Long studentId) {
    return portal.profile(studentId);
  }

  @GetMapping("/payments")
  public PortalDtos.Payments payments(@RequestAttribute(AuthFilter.PORTAL_STUDENT) Long studentId) {
    return portal.payments(studentId);
  }

  @GetMapping("/academics")
  public PortalDtos.Academics academics(@RequestAttribute(AuthFilter.PORTAL_STUDENT) Long studentId) {
    return portal.academics(studentId);
  }

  @GetMapping("/attendance")
  public PortalDtos.Attendance attendance(@RequestAttribute(AuthFilter.PORTAL_STUDENT) Long studentId) {
    return portal.attendance(studentId);
  }

  @GetMapping("/requests")
  public PortalDtos.Requests requests(@RequestAttribute(AuthFilter.PORTAL_STUDENT) Long studentId) {
    return portal.requestsOf(studentId);
  }

  @GetMapping("/services")
  public PortalDtos.Services services(@RequestAttribute(AuthFilter.PORTAL_STUDENT) Long studentId) {
    return portal.services(studentId);
  }

  @GetMapping("/course")
  public PortalDtos.CourseOverview course(
      @RequestAttribute(AuthFilter.PORTAL_STUDENT) Long studentId) {
    return portal.course(studentId);
  }

  @GetMapping("/modules/{id}")
  public PortalDtos.ModuleDetail module(
      @RequestAttribute(AuthFilter.PORTAL_STUDENT) Long studentId, @PathVariable Long id) {
    return portal.moduleDetail(studentId, id);
  }

  @GetMapping("/online-classes")
  public PortalDtos.OnlineClasses onlineClasses(
      @RequestAttribute(AuthFilter.PORTAL_STUDENT) Long studentId) {
    return portal.onlineClasses(studentId);
  }

  @GetMapping("/requests/attachments/{id}")
  public ResponseEntity<Resource> requestAttachment(
      @RequestAttribute(AuthFilter.PORTAL_STUDENT) Long studentId, @PathVariable Long id) {
    StudentRequestService.AttachmentFile file = portal.requestAttachment(studentId, id);
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(file.contentType()))
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.attachment().filename(file.fileName()).build().toString())
        .body(new FileSystemResource(file.path()));
  }

  @GetMapping("/notifications")
  public PortalDtos.Notifications notifications(
      @RequestAttribute(AuthFilter.PORTAL_STUDENT) Long studentId) {
    return portal.notifications(studentId);
  }

  @GetMapping("/request-types")
  public List<StudentRequestDtos.TypeResponse> requestTypes() {
    return portal.requestTypes();
  }

  @PostMapping("/requests")
  @ResponseStatus(HttpStatus.CREATED)
  public StudentRequestDtos.Response createRequest(
      @RequestAttribute(AuthFilter.PORTAL_STUDENT) Long studentId,
      @RequestPart("request") StudentRequestDtos.Request request,
      @RequestPart(value = "files", required = false) List<MultipartFile> files) {
    return portal.createRequest(studentId, request, files);
  }
}
