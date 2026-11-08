package mz.cacoin.exams;

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
@RequestMapping("/api/settings/exams")
@RequiredArgsConstructor
public class ExamSettingsController {
  private final ExamSettingsService settings;

  @GetMapping
  public ExamSettingsResponse get() {
    return settings.get();
  }

  @PutMapping
  public ExamSettingsResponse update(@RequestBody ExamSettingsRequest request) {
    return settings.update(request);
  }

  @PatchMapping("/fees/{examType}")
  public ExamSettingsResponse updateFee(
      @PathVariable String examType, @RequestBody ExamFeeRequest request) {
    return settings.updateFee(normalizeType(examType), request);
  }

  @DeleteMapping("/fees/{examType}")
  public ExamSettingsResponse deleteFee(@PathVariable String examType) {
    return settings.deleteFee(normalizeType(examType));
  }

  @PatchMapping("/fees/{examType}/activation")
  public ExamSettingsResponse setFeeActive(
      @PathVariable String examType, @RequestBody ExamFeeActivationRequest request) {
    return settings.setFeeActive(normalizeType(examType), request);
  }

  private String normalizeType(String examType) {
    return examType == null ? "" : examType.trim().toUpperCase(java.util.Locale.ROOT);
  }
}
