package mz.cacoin.tests;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings/tests")
@RequiredArgsConstructor
public class TestSettingsController {
  private final TestSettingsService settings;

  @GetMapping
  public TestSettingsResponse get() {
    return settings.get();
  }

  @PutMapping
  public TestSettingsResponse update(@RequestBody TestSettingsRequest request) {
    return settings.update(request);
  }

  @PatchMapping("/fees/{testType}")
  public TestSettingsResponse updateFee(
      @PathVariable String testType, @RequestBody TestFeeRequest request) {
    return settings.updateFee(normalizeType(testType), request);
  }

  @DeleteMapping("/fees/{testType}")
  public TestSettingsResponse deleteFee(@PathVariable String testType) {
    return settings.deleteFee(normalizeType(testType));
  }

  @PatchMapping("/fees/{testType}/activation")
  public TestSettingsResponse setFeeActive(
      @PathVariable String testType, @RequestBody TestFeeActivationRequest request) {
    return settings.setFeeActive(normalizeType(testType), request);
  }

  private String normalizeType(String testType) {
    return testType == null ? "" : testType.trim().toUpperCase(java.util.Locale.ROOT);
  }
}
