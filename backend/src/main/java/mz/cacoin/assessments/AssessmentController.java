package mz.cacoin.assessments;

import org.springframework.web.bind.annotation.DeleteMapping;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
@RequestMapping("/api/assessments")
@RequiredArgsConstructor
public class AssessmentController {
  private final AssessmentService assessments;

  @GetMapping("/sheets")
  public List<AssessmentSheetResponse> list(
      @RequestParam(required = false) Long courseId,
      @RequestParam(required = false) Integer year) {
    return assessments.list(courseId, year);
  }

  @PostMapping("/sheets")
  @ResponseStatus(HttpStatus.CREATED)
  public AssessmentSheetResponse create(@RequestBody AssessmentSheetRequest request) {
    return assessments.create(request);
  }

  @GetMapping("/teachers")
  public List<AssessmentTeacherResponse> teachers(@RequestParam(required = false) Long courseId) {
    return assessments.teachers(courseId);
  }

  @GetMapping("/sheets/{id}/components/{component}/grades")
  public List<AssessmentEntryResponse> entries(
      @PathVariable Long id, @PathVariable String component) {
    return assessments.entries(id, component);
  }

  @PutMapping("/sheets/{id}/components/{component}/grades")
  public List<AssessmentEntryResponse> saveGrades(
      @PathVariable Long id,
      @PathVariable String component,
      @RequestBody AssessmentGradesRequest request) {
    return assessments.saveGrades(id, component, request);
  }

  @GetMapping("/grades")
  public List<AssessmentGradesRowResponse> notas(
      @RequestParam(required = false) Long courseId,
      @RequestParam(required = false) Integer year,
      @RequestParam(required = false) Long sheetId,
      @RequestParam(required = false) Boolean completed) {
    return assessments.notas(courseId, year, sheetId, completed);
  }

  @PostMapping("/sheets/{id}/students/{studentId}/complete")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void complete(@PathVariable Long id, @PathVariable Long studentId) {
    assessments.complete(id, studentId);
  }

  @DeleteMapping("/sheets/{id}/students/{studentId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void remove(@PathVariable Long id, @PathVariable Long studentId) {
    assessments.remove(id, studentId);
  }
}
