package mz.cacoin.leaves;

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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class LeaveController {
  private final LeaveService leaves;

  @GetMapping("/settings/leaves")
  public LeaveDtos.SettingsResponse getSettings() {
    return leaves.getSettings();
  }

  @PutMapping("/settings/leaves")
  public LeaveDtos.SettingsResponse updateSettings(
      @RequestBody LeaveDtos.SettingsRequest request) {
    return leaves.updateSettings(request);
  }

  @DeleteMapping("/settings/leaves")
  public LeaveDtos.SettingsResponse deleteSettings() {
    return leaves.deleteSettings();
  }

  @GetMapping("/leaves/requests")
  public List<LeaveDtos.Response> list() {
    return leaves.list();
  }

  @PostMapping("/leaves/requests")
  @ResponseStatus(HttpStatus.CREATED)
  public LeaveDtos.Response create(@RequestBody LeaveDtos.Request request) {
    return leaves.create(request);
  }

  @PatchMapping("/leaves/requests/{id}/status")
  public LeaveDtos.Response setStatus(
      @PathVariable Long id, @RequestBody LeaveDtos.StatusRequest request) {
    return leaves.setStatus(id, request);
  }
}
