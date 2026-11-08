package mz.cacoin.courses.levels;

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
@RequestMapping("/api/courses/levels")
@RequiredArgsConstructor
public class LevelController {
  private final LevelService levels;

  @GetMapping
  public List<LevelResponse> list() {
    return levels.list();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public LevelResponse create(@RequestBody LevelRequest request) {
    return levels.create(request);
  }

  @PutMapping("/{id}")
  public LevelResponse update(@PathVariable Long id, @RequestBody LevelRequest request) {
    return levels.update(id, request);
  }

  @PatchMapping("/{id}/activation")
  public LevelResponse setActive(
      @PathVariable Long id, @RequestBody LevelActivationRequest request) {
    return levels.setActive(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Long id) {
    levels.delete(id);
  }
}
