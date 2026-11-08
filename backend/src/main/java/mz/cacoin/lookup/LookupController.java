package mz.cacoin.lookup;

import lombok.RequiredArgsConstructor;
import mz.cacoin.portal.PortalDtos;
import mz.cacoin.portal.PortalService;
import mz.cacoin.requests.StudentRequestService;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Pesquisa de estudante (StudentLookUp): devolve os mesmos dados do portal do estudante,
 * mas para qualquer estudante identificado pelo código e apenas em modo de consulta.
 * Este controlador só expõe pedidos GET; qualquer endpoint novo do portal que seja
 * de leitura deve ter aqui o equivalente.
 */
@RestController
@RequestMapping("/api/lookup/{code}")
@RequiredArgsConstructor
public class LookupController {
  private final LookupService lookup;
  private final PortalService portal;

  @GetMapping("/overview")
  public PortalDtos.Overview overview(@PathVariable String code) {
    return portal.overview(lookup.studentId(code));
  }

  @GetMapping("/profile")
  public PortalDtos.Profile profile(@PathVariable String code) {
    return portal.profile(lookup.studentId(code));
  }

  @GetMapping("/payments")
  public PortalDtos.Payments payments(@PathVariable String code) {
    return portal.payments(lookup.studentId(code));
  }

  @GetMapping("/academics")
  public PortalDtos.Academics academics(@PathVariable String code) {
    return portal.academics(lookup.studentId(code));
  }

  @GetMapping("/attendance")
  public PortalDtos.Attendance attendance(@PathVariable String code) {
    return portal.attendance(lookup.studentId(code));
  }

  @GetMapping("/requests")
  public PortalDtos.Requests requests(@PathVariable String code) {
    return portal.requestsOf(lookup.studentId(code));
  }

  @GetMapping("/services")
  public PortalDtos.Services services(@PathVariable String code) {
    return portal.services(lookup.studentId(code));
  }

  @GetMapping("/course")
  public PortalDtos.CourseOverview course(@PathVariable String code) {
    return portal.course(lookup.studentId(code));
  }

  @GetMapping("/modules/{id}")
  public PortalDtos.ModuleDetail module(@PathVariable String code, @PathVariable Long id) {
    return portal.moduleDetail(lookup.studentId(code), id);
  }

  @GetMapping("/online-classes")
  public PortalDtos.OnlineClasses onlineClasses(@PathVariable String code) {
    return portal.onlineClasses(lookup.studentId(code));
  }

  @GetMapping("/notifications")
  public PortalDtos.Notifications notifications(@PathVariable String code) {
    return portal.notifications(lookup.studentId(code));
  }

  @GetMapping("/requests/attachments/{id}")
  public ResponseEntity<Resource> requestAttachment(
      @PathVariable String code, @PathVariable Long id) {
    StudentRequestService.AttachmentFile file =
        portal.requestAttachment(lookup.studentId(code), id);
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(file.contentType()))
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.inline().filename(file.fileName()).build().toString())
        .body(new FileSystemResource(file.path()));
  }
}
