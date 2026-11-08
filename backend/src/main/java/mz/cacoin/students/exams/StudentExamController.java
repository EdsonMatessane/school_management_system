package mz.cacoin.students.exams;

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
@RequestMapping("/api/students/exams")
@RequiredArgsConstructor
public class StudentExamController {
  private final StudentExamService exams;

  @GetMapping
  public List<StudentExamResponse> list() {
    return exams.list();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public StudentExamResponse create(@RequestBody StudentExamRequest request) {
    return exams.create(request);
  }

  @PutMapping("/{id}")
  public StudentExamResponse update(
      @PathVariable Long id, @RequestBody StudentExamRequest request) {
    return exams.update(id, request);
  }

  @PatchMapping("/{id}/status")
  public StudentExamResponse setCompleted(
      @PathVariable Long id, @RequestBody StudentExamStatusRequest request) {
    return exams.setCompleted(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Long id) {
    exams.delete(id);
  }

  @GetMapping("/{id}/grades")
  public List<StudentExamGradeResponse> listGrades(@PathVariable Long id) {
    return exams.listGrades(id);
  }

  @PostMapping("/{id}/grades")
  @ResponseStatus(HttpStatus.CREATED)
  public StudentExamGradeResponse addGrade(
      @PathVariable Long id, @RequestBody StudentExamGradeRequest request) {
    return exams.addGrade(id, request);
  }

  @PutMapping("/{id}/grades/{gradeId}")
  public StudentExamGradeResponse updateGrade(
      @PathVariable Long id,
      @PathVariable Long gradeId,
      @RequestBody StudentExamGradeRequest request) {
    return exams.updateGrade(id, gradeId, request);
  }

  @DeleteMapping("/{id}/grades/{gradeId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteGrade(@PathVariable Long id, @PathVariable Long gradeId) {
    exams.deleteGrade(id, gradeId);
  }
}
