package mz.cacoin.settings;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class SystemSettingsController {
  private final SystemSettingsService service;

  @GetMapping
  public SystemSettingsResponse get() {
    return service.get();
  }

  @PutMapping
  public SystemSettingsResponse update(@RequestBody SystemSettingsRequest request) {
    return service.update(request);
  }
}
