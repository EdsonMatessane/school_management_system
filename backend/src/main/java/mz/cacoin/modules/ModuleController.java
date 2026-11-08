package mz.cacoin.modules;

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
@RequestMapping("/api/modules")
@RequiredArgsConstructor
public class ModuleController {
  private final ModuleService modules;

  @GetMapping
  public List<ModuleSummaryResponse> list() {
    return modules.list();
  }

  @GetMapping("/{id}")
  public ModuleResponse get(@PathVariable Long id) {
    return modules.get(id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ModuleResponse create(@RequestBody ModuleRequest request) {
    return modules.create(request);
  }

  @PutMapping("/{id}")
  public ModuleResponse update(@PathVariable Long id, @RequestBody ModuleRequest request) {
    return modules.update(id, request);
  }

  @PatchMapping("/{id}/activation")
  public ModuleResponse setActive(
      @PathVariable Long id, @RequestBody ModuleActivationRequest request) {
    return modules.setActive(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Long id) {
    modules.delete(id);
  }
}
