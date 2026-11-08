package mz.cacoin.graduations;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings/graduations")
@RequiredArgsConstructor
public class GraduationSettingsController {
  private final GraduationSettingsService settings;

  @GetMapping
  public GraduationSettingsResponse get() {
    return settings.get();
  }

  @PutMapping
  public GraduationSettingsResponse update(@RequestBody GraduationSettingsRequest request) {
    return settings.update(request);
  }

  @PatchMapping("/fees/{key}")
  public GraduationSettingsResponse updateFee(
      @PathVariable String key, @RequestBody GraduationFeeRequest request) {
    return settings.updateFee(key, request);
  }

  @DeleteMapping("/fees/{key}")
  public GraduationSettingsResponse deleteFee(@PathVariable String key) {
    return settings.deleteFee(key);
  }

  @PatchMapping("/fees/{key}/activation")
  public GraduationSettingsResponse setFeeActive(
      @PathVariable String key, @RequestBody GraduationFeeActivationRequest request) {
    return settings.setFeeActive(key, request);
  }

  @PatchMapping("/guests")
  public GraduationSettingsResponse updateGuests(@RequestBody GraduationGuestsRequest request) {
    return settings.updateGuests(request);
  }

  @PutMapping("/period")
  public GraduationSettingsResponse updatePeriod(@RequestBody GraduationPeriodRequest request) {
    return settings.updatePeriod(request);
  }

  @PutMapping("/day")
  public GraduationSettingsResponse updateDay(@RequestBody GraduationDayRequest request) {
    return settings.updateDay(request);
  }
}
