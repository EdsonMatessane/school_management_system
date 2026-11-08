package mz.cacoin.staffdocuments;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/staff-documents")
@RequiredArgsConstructor
public class StaffDocumentController {
  private final StaffDocumentService documents;

  @GetMapping("/types")
  public List<StaffDocumentTypeResponse> listTypes() {
    return documents.listTypes();
  }

  @PostMapping("/types")
  @ResponseStatus(HttpStatus.CREATED)
  public StaffDocumentTypeResponse createType(@RequestBody StaffDocumentTypeRequest request) {
    return documents.createType(request);
  }

  @PutMapping("/types/{id}")
  public StaffDocumentTypeResponse updateType(
      @PathVariable Long id, @RequestBody StaffDocumentTypeRequest request) {
    return documents.updateType(id, request);
  }

  @DeleteMapping("/types/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteType(@PathVariable Long id) {
    documents.deleteType(id);
  }

  @GetMapping("/staff/{staffId}")
  public List<StaffDocumentResponse> list(@PathVariable Long staffId) {
    return documents.list(staffId);
  }

  @PostMapping("/staff/{staffId}")
  @ResponseStatus(HttpStatus.CREATED)
  public StaffDocumentResponse create(
      @PathVariable Long staffId, @RequestBody StaffDocumentRequest request) {
    return documents.create(staffId, request);
  }

  @PutMapping("/{id}")
  public StaffDocumentResponse update(
      @PathVariable Long id, @RequestBody StaffDocumentRequest request) {
    return documents.update(id, request);
  }

  @PutMapping("/{id}/renewal")
  public StaffDocumentResponse renew(
      @PathVariable Long id, @RequestBody StaffDocumentRenewRequest request) {
    return documents.renew(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Long id) {
    documents.delete(id);
  }

  @GetMapping("/expiring")
  public List<StaffDocumentExpirationResponse> expiring(
      @RequestParam(required = false) Integer days) {
    return documents.expiring(days);
  }

  @GetMapping("/expired")
  public List<StaffDocumentExpirationResponse> expired() {
    return documents.expired();
  }
}
