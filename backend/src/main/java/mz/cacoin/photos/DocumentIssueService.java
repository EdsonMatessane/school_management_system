package mz.cacoin.photos;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DocumentIssueService {
  private final DocumentIssueRepository issues;

  public DocumentIssueService(DocumentIssueRepository issues) {
    this.issues = issues;
  }

  @Transactional
  public void recordStudent(Long studentId, String document) {
    issues.save(issue(document, studentId, null));
  }

  @Transactional
  public void recordStaff(Long staffId, String document) {
    issues.save(issue(document, null, staffId));
  }

  private static DocumentIssue issue(String document, Long studentId, Long staffId) {
    if (!DocumentIssue.CARD.equals(document) && !DocumentIssue.LETTER.equals(document)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Documento desconhecido");
    }
    DocumentIssue issue = new DocumentIssue();
    issue.setDocument(document);
    issue.setStudentId(studentId);
    issue.setStaffId(staffId);
    return issue;
  }
}
