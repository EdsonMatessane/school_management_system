package mz.cacoin.requests;

import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import mz.cacoin.common.RichText;
import mz.cacoin.notifications.NotificationDtos;
import mz.cacoin.notifications.NotificationService;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class StudentRequestNotifier {
  private final NotificationService notifications;

  @Transactional(propagation = Propagation.NOT_SUPPORTED)
  public void notify(Long studentId, String message) {
    if (message == null || RichText.isBlank(message)) {
      return;
    }
    for (String channel : List.of(NotificationService.WHATSAPP, NotificationService.SMS)) {
      try {
        notifications.send(
            new NotificationDtos.SendRequest(channel, "STUDENT", studentId, null, message));
        return;
      } catch (RuntimeException exception) {
        log.warn("Não foi possível notificar o estudante {} por {}", studentId, channel, exception);
      }
    }
  }
}
