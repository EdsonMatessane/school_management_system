package mz.cacoin.pautas;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings/pautas")
@RequiredArgsConstructor
public class PautaSettingsController {
  private final PautaSettingsService settings;

  @GetMapping
  public PautaSettingsResponse get() {
    return settings.get();
  }

  @PutMapping("/period")
  public PautaSettingsResponse updatePeriod(@RequestBody PautaSettingsRequest request) {
    return settings.updatePeriod(request);
  }
}
