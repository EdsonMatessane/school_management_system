package mz.cacoin.portal;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import mz.cacoin.photos.DocumentIssue;
import mz.cacoin.photos.DocumentIssueService;
import mz.cacoin.photos.PersonPhotoService;
import mz.cacoin.students.StudentRepository;

/**
 * Gestão de cartões de estudante (secretaria): dados dos cartões, fotografia de cada cartão e
 * registo das emissões. A fotografia só se altera aqui; o estudante não a pode mudar.
 */
@RestController
@RequestMapping("/api/student-cards")
@RequiredArgsConstructor
public class StudentCardsController {
  private static final int MAX_CARDS = 300;

  public record CardsRequest(List<Long> ids) {}

  private final PortalService portal;
  private final PersonPhotoService photos;
  private final DocumentIssueService issues;
  private final StudentRepository students;

  @PostMapping
  public List<PortalDtos.Documents> cards(@RequestBody CardsRequest request) {
    return portal.documentsFor(limited(request));
  }

  @PutMapping("/{studentId}/photo")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void savePhoto(
      @PathVariable Long studentId, @RequestBody PortalDtos.PhotoRequest request) {
    requireStudent(studentId);
    photos.saveStudent(studentId, request.photo());
  }

  @DeleteMapping("/{studentId}/photo")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void removePhoto(@PathVariable Long studentId) {
    requireStudent(studentId);
    photos.removeStudent(studentId);
  }

  /** Regista que os cartões destes estudantes foram exportados em PDF. */
  @PostMapping("/issued")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void issued(@RequestBody CardsRequest request) {
    limited(request).stream()
        .filter(id -> id != null && students.existsById(id))
        .forEach(id -> issues.recordStudent(id, DocumentIssue.CARD));
  }

  private void requireStudent(Long studentId) {
    if (studentId == null || !students.existsById(studentId)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Estudante não encontrado");
    }
  }

  private static List<Long> limited(CardsRequest request) {
    List<Long> ids = request == null || request.ids() == null ? List.of() : request.ids();
    if (ids.size() > MAX_CARDS) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Escolha no máximo " + MAX_CARDS + " estudantes de cada vez");
    }
    return ids;
  }
}
