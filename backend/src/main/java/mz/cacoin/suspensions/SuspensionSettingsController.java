package mz.cacoin.suspensions;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings/suspensions")
@RequiredArgsConstructor
public class SuspensionSettingsController {
  private final SuspensionSettingsService settings;

  @GetMapping
  public SuspensionSettingsResponse get() {
    return settings.get();
  }

  @PatchMapping("/fee")
  public SuspensionSettingsResponse updateFee(@RequestBody SuspensionFeeRequest request) {
    return settings.updateFee(request);
  }

  @DeleteMapping("/fee")
  public SuspensionSettingsResponse deleteFee() {
    return settings.deleteFee();
  }

  @PatchMapping("/fee/activation")
  public SuspensionSettingsResponse setFeeActive(
      @RequestBody SuspensionFeeActivationRequest request) {
    return settings.setFeeActive(request);
  }
}
