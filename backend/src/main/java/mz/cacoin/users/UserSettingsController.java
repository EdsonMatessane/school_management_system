package mz.cacoin.users;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings/users")
@RequiredArgsConstructor
public class UserSettingsController {
  private final UserSettingsService settings;

  @GetMapping
  public UserDtos.SettingsResponse get() {
    return settings.get();
  }

  @PutMapping
  public UserDtos.SettingsResponse update(@RequestBody UserDtos.SettingsRequest request) {
    return settings.update(request);
  }
}
