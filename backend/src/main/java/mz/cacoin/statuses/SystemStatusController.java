package mz.cacoin.statuses;

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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings/statuses")
@RequiredArgsConstructor
public class SystemStatusController {
  private final SystemStatusService statuses;

  @GetMapping
  public List<SystemStatusResponse> list(
      @RequestParam(name = "modules", required = false) List<String> modules) {
    return statuses.list(modules);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public SystemStatusResponse create(@RequestBody SystemStatusRequest request) {
    return statuses.create(request);
  }

  @PutMapping("/{id}")
  public SystemStatusResponse update(
      @PathVariable Long id, @RequestBody SystemStatusRequest request) {
    return statuses.update(id, request);
  }

  @PatchMapping("/{id}/activation")
  public SystemStatusResponse setActive(
      @PathVariable Long id, @RequestBody SystemStatusActivationRequest request) {
    return statuses.setActive(id, request == null ? null : request.active());
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Long id) {
    statuses.delete(id);
  }
}
