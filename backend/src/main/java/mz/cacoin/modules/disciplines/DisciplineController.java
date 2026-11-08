package mz.cacoin.modules.disciplines;

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
@RequestMapping("/api/disciplines")
@RequiredArgsConstructor
public class DisciplineController {
  private final DisciplineService disciplines;

  @GetMapping
  public List<DisciplineResponse> list() {
    return disciplines.list();
  }

  @GetMapping("/course/{courseId}")
  public List<DisciplineResponse> listByCourse(@PathVariable Long courseId) {
    return disciplines.listByCourse(courseId);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public DisciplineResponse create(@RequestBody DisciplineRequest request) {
    return disciplines.create(request);
  }

  @PutMapping("/{id}")
  public DisciplineResponse update(
      @PathVariable Long id, @RequestBody DisciplineRequest request) {
    return disciplines.update(id, request);
  }

  @PatchMapping("/{id}/activation")
  public DisciplineResponse setActive(
      @PathVariable Long id, @RequestBody DisciplineActivationRequest request) {
    return disciplines.setActive(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Long id) {
    disciplines.delete(id);
  }
}
