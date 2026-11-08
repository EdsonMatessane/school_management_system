package mz.cacoin.students.tests;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/students/tests")
@RequiredArgsConstructor
public class StudentTestController {
  private final StudentTestService tests;

  @GetMapping
  public List<StudentTestResponse> list() {
    return tests.list();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public StudentTestResponse create(@RequestBody StudentTestRequest request) {
    return tests.create(request);
  }

  @PutMapping("/{id}")
  public StudentTestResponse update(
      @PathVariable Long id, @RequestBody StudentTestRequest request) {
    return tests.update(id, request);
  }

  @PatchMapping("/{id}/status")
  public StudentTestResponse setCompleted(
      @PathVariable Long id, @RequestBody StudentTestStatusRequest request) {
    return tests.setCompleted(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Long id) {
    tests.delete(id);
  }

  @GetMapping("/{id}/grades")
  public List<StudentTestGradeResponse> listGrades(@PathVariable Long id) {
    return tests.listGrades(id);
  }

  @PostMapping("/{id}/grades")
  @ResponseStatus(HttpStatus.CREATED)
  public StudentTestGradeResponse addGrade(
      @PathVariable Long id, @RequestBody StudentTestGradeRequest request) {
    return tests.addGrade(id, request);
  }

  @PutMapping("/{id}/grades/{gradeId}")
  public StudentTestGradeResponse updateGrade(
      @PathVariable Long id,
      @PathVariable Long gradeId,
      @RequestBody StudentTestGradeRequest request) {
    return tests.updateGrade(id, gradeId, request);
  }

  @DeleteMapping("/{id}/grades/{gradeId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteGrade(@PathVariable Long id, @PathVariable Long gradeId) {
    tests.deleteGrade(id, gradeId);
  }
}
