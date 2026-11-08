package mz.cacoin.fines;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings/fines")
@RequiredArgsConstructor
public class FineSettingsController {
  private final FineSettingsService service;

  @GetMapping
  public FineSettingsService.Response get() {
    return service.get();
  }

  @PutMapping
  public FineSettingsService.Response save(@RequestBody FineSettingsService.Request request) {
    return service.save(request);
  }

  @DeleteMapping
  public FineSettingsService.Response delete() {
    return service.delete();
  }
}
