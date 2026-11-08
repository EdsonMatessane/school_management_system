package mz.cacoin.graduations;

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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings/graduations/requirements")
@RequiredArgsConstructor
public class GraduationRequirementController {
  private final GraduationRequirementService requirements;

  @GetMapping
  public List<GraduationRequirementResponse> list() {
    return requirements.list();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public GraduationRequirementResponse create(@RequestBody GraduationRequirementRequest request) {
    return requirements.create(request);
  }

  @PutMapping("/{id}")
  public GraduationRequirementResponse update(
      @PathVariable Long id, @RequestBody GraduationRequirementRequest request) {
    return requirements.update(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Long id) {
    requirements.delete(id);
  }
}
