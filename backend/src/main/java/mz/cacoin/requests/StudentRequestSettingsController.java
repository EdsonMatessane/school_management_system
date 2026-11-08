package mz.cacoin.requests;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings/requests")
@RequiredArgsConstructor
public class StudentRequestSettingsController {
  private final StudentRequestSettingsService settings;

  @GetMapping("/types")
  public List<StudentRequestDtos.TypeResponse> listTypes() {
    return settings.listTypes();
  }

  @PostMapping("/types")
  @ResponseStatus(HttpStatus.CREATED)
  public StudentRequestDtos.TypeResponse createType(
      @RequestBody StudentRequestDtos.TypeRequest request) {
    return settings.createType(request);
  }

  @PutMapping("/types/{id}")
  public StudentRequestDtos.TypeResponse updateType(
      @PathVariable Long id, @RequestBody StudentRequestDtos.TypeRequest request) {
    return settings.updateType(id, request);
  }

  @DeleteMapping("/types/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteType(@PathVariable Long id) {
    settings.deleteType(id);
  }

  @GetMapping("/notifications")
  public StudentRequestDtos.SettingsResponse getSettings() {
    return settings.getSettings();
  }

  @PutMapping("/notifications")
  public StudentRequestDtos.SettingsResponse updateSettings(
      @RequestBody StudentRequestDtos.SettingsRequest request) {
    return settings.updateSettings(request);
  }
}
