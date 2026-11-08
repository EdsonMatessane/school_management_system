package mz.cacoin.attendances;

import java.math.BigDecimal;
import lombok.RequiredArgsConstructor;
import mz.cacoin.onlineclasses.OnlineAttendanceSettings;
import mz.cacoin.onlineclasses.OnlineAttendanceSettingsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AttendanceSettingsService {
  static final String DEFAULT_MESSAGE =
      "Excedeu o número máximo de faltas permitido. Contacte a secretaria.";

  private final OnlineAttendanceSettingsRepository settings;

  @Transactional(readOnly = true)
  public Integer maxAbsences() {
    return settings.findById(1)
        .map(OnlineAttendanceSettings::getMaxAbsences)
        .filter(value -> value != null && value > 0)
        .orElse(null);
  }

  @Transactional(readOnly = true)
  public String notificationMessage() {
    return settings.findById(1)
        .map(OnlineAttendanceSettings::getNotificationMessage)
        .filter(value -> value != null && !value.isBlank())
        .orElse(DEFAULT_MESSAGE);
  }

  @Transactional(readOnly = true)
  public BigDecimal justificationFee() {
    return settings.findById(1)
        .map(OnlineAttendanceSettings::getJustificationFee)
        .filter(value -> value != null && value.signum() >= 0)
        .orElse(BigDecimal.ZERO);
  }
}
