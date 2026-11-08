package mz.cacoin.settings;

import jakarta.annotation.PostConstruct;
import java.time.ZoneId;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SystemDateSource {
  private static final long CACHE_MILLIS = 2_000L;

  private final SystemSettingsRepository repository;
  private volatile SystemDate.Config cached;
  private volatile long loadedAt;

  @PostConstruct
  void register() {
    SystemDate.configure(this::load);
  }

  void refresh() {
    cached = null;
  }

  private SystemDate.Config load() {
    long now = System.currentTimeMillis();
    SystemDate.Config current = cached;
    if (current != null && now - loadedAt < CACHE_MILLIS) {
      return current;
    }
    SystemSettings settings = repository.findById(1L).orElseGet(SystemSettings::new);
    SystemDate.Config loaded = new SystemDate.Config(
        ZoneId.of(settings.getTimeZone()),
        Boolean.TRUE.equals(settings.getPreviousYearEnabled()) ? settings.getSystemYear() : null,
        settings.getAcademicYearStartMonth(),
        settings.getAcademicYearEndMonth() == null ? 12 : settings.getAcademicYearEndMonth());
    cached = loaded;
    loadedAt = now;
    return loaded;
  }
}
