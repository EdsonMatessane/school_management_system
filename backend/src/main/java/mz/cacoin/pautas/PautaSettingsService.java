package mz.cacoin.pautas;

import java.time.LocalDateTime;
import java.time.ZoneId;
import lombok.RequiredArgsConstructor;
import mz.cacoin.settings.SystemSettingsRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class PautaSettingsService {
  private final PautaSettingsRepository settings;
  private final SystemSettingsRepository systemSettings;

  @Transactional
  public PautaSettingsResponse get() {
    return toResponse(findOrCreate());
  }

  @Transactional
  public PautaSettingsResponse updatePeriod(PautaSettingsRequest request) {
    if (request == null) {
      throw badRequest("Indique o período de lançamento de pautas");
    }
    LocalDateTime start = request.launchPeriodStart();
    LocalDateTime end = request.launchPeriodEnd();
    if ((start == null) != (end == null)) {
      throw badRequest("Indique o início e o fim do período de lançamento de pautas");
    }
    if (start != null && !start.isBefore(end)) {
      throw badRequest("O fim do período de lançamento de pautas deve ser posterior ao início");
    }
    PautaSettings current = findOrCreate();
    current.setLaunchPeriodStart(start);
    current.setLaunchPeriodEnd(end);
    return toResponse(settings.save(current));
  }

  @Transactional
  public void requireLaunchPeriodOpen() {
    PautaSettings current = findOrCreate();
    LocalDateTime start = current.getLaunchPeriodStart();
    LocalDateTime end = current.getLaunchPeriodEnd();
    if (start == null || end == null) return;
    String timeZone = systemSettings.findById(1L)
        .map(setting -> setting.getTimeZone())
        .orElse("Africa/Maputo");
    LocalDateTime now = LocalDateTime.now(ZoneId.of(timeZone));
    if (now.isBefore(start) || now.isAfter(end)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "O lançamento de pautas só está disponível durante o período configurado");
    }
  }

  private PautaSettings findOrCreate() {
    return settings.findById(1L).orElseGet(() -> settings.save(new PautaSettings()));
  }

  private PautaSettingsResponse toResponse(PautaSettings value) {
    return new PautaSettingsResponse(value.getLaunchPeriodStart(), value.getLaunchPeriodEnd());
  }

  private ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
