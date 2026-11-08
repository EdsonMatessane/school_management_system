package mz.cacoin.courses.modalities;

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
@RequestMapping("/api/courses/modalities")
@RequiredArgsConstructor
public class ModalityController {
  private final ModalityService modalities;

  @GetMapping
  public List<ModalityResponse> list() {
    return modalities.list();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ModalityResponse create(@RequestBody ModalityRequest request) {
    return modalities.create(request);
  }

  @PutMapping("/{id}")
  public ModalityResponse update(@PathVariable Long id, @RequestBody ModalityRequest request) {
    return modalities.update(id, request);
  }

  @PatchMapping("/{id}/activation")
  public ModalityResponse setActive(
      @PathVariable Long id, @RequestBody ModalityActivationRequest request) {
    return modalities.setActive(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Long id) {
    modalities.delete(id);
  }
}
