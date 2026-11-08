package mz.cacoin.courses;

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
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class CourseController {
  private final CourseService courses;

  @GetMapping
  public List<CourseResponse> list() {
    return courses.list();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public CourseResponse create(@RequestBody CourseRequest request) {
    return courses.create(request);
  }

  @PutMapping("/{id}")
  public CourseResponse update(@PathVariable Long id, @RequestBody CourseRequest request) {
    return courses.update(id, request);
  }

  @PatchMapping("/{id}/activation")
  public CourseResponse setActive(
      @PathVariable Long id, @RequestBody CourseActivationRequest request) {
    return courses.setActive(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Long id) {
    courses.delete(id);
  }
}
