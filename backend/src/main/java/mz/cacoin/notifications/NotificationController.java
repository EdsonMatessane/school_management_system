package mz.cacoin.notifications;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class NotificationController {
  private final NotificationService notifications;

  @GetMapping("/settings/notifications/{channel}")
  public NotificationDtos.SettingsResponse getSettings(@PathVariable String channel) {
    return notifications.getSettings(channel);
  }

  @PutMapping("/settings/notifications/{channel}")
  public NotificationDtos.SettingsResponse updateSettings(
      @PathVariable String channel, @RequestBody NotificationDtos.SettingsRequest request) {
    return notifications.updateSettings(channel, request);
  }

  @GetMapping("/notifications/messages")
  public List<NotificationDtos.Response> list(
      @RequestParam(name = "channel", required = false) String channel) {
    return notifications.list(channel);
  }

  @PostMapping("/notifications/messages")
  @ResponseStatus(HttpStatus.CREATED)
  public NotificationDtos.Response send(@RequestBody NotificationDtos.SendRequest request) {
    return notifications.send(request);
  }

  @PostMapping("/notifications/messages/{id}/resend")
  public NotificationDtos.Response resend(@PathVariable Long id) {
    return notifications.resend(id);
  }
}
