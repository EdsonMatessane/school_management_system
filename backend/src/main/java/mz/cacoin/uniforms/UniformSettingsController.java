package mz.cacoin.uniforms;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings/uniforms")
@RequiredArgsConstructor
public class UniformSettingsController {
  private final UniformSettingsService settings;

  @GetMapping
  public UniformSettingsResponse get() {
    return settings.get();
  }

  @PatchMapping("/fee")
  public UniformSettingsResponse updateFee(@RequestBody UniformFeeRequest request) {
    return settings.updateFee(request);
  }

  @DeleteMapping("/fee")
  public UniformSettingsResponse deleteFee() {
    return settings.deleteFee();
  }

  @PatchMapping("/fee/activation")
  public UniformSettingsResponse setFeeActive(@RequestBody UniformFeeActivationRequest request) {
    return settings.setFeeActive(request);
  }
}
