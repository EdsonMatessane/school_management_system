package mz.cacoin.audit;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import lombok.RequiredArgsConstructor;
import mz.cacoin.settings.SystemSettings;
import mz.cacoin.settings.SystemSettingsRepository;
import mz.cacoin.users.UserSettings;
import mz.cacoin.users.UserSettingsRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class UserLogRetention {
  private final UserLogRepository logs;
  private final UserSettingsRepository userSettings;
  private final SystemSettingsRepository systemSettings;

  @Scheduled(initialDelay = 60_000, fixedDelay = 3_600_000)
  @Transactional
  public void wipeWhenDue() {
    ZoneId zone = ZoneId.of(systemSettings.findById(1L).orElseGet(SystemSettings::new).getTimeZone());
    LocalDate today = LocalDate.now(zone);
    int month = today.getMonthValue();
    int periodMonth = month % 2 == 1 ? month : month - 1;
    Instant boundary = LocalDate.of(today.getYear(), periodMonth, 1).atStartOfDay(zone).toInstant();
    UserSettings settings = userSettings.findById(UserSettings.SINGLETON_ID).orElseGet(UserSettings::new);
    Instant wipedAt = settings.getLogsWipedAt();
    if (wipedAt == null || wipedAt.isBefore(boundary)) {
      if (wipedAt != null) {
        logs.deleteAllInBatch();
      }
      settings.setLogsWipedAt(Instant.now());
      userSettings.save(settings);
    }
  }
}
