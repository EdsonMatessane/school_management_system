package mz.cacoin.fines;

import java.math.BigDecimal;
import java.math.RoundingMode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class FineSettingsService {
  private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

  private final FineSettingsRepository settings;

  public record Response(BigDecimal percent) {}

  public record Request(BigDecimal percent) {}

  @Transactional(readOnly = true)
  public Response get() {
    return new Response(settings.findById(FineSettings.SINGLE_ID)
        .map(FineSettings::getLatePercent).orElse(null));
  }

  /** Percentagem em vigor (zero quando não está definida: não há multa). */
  @Transactional(readOnly = true)
  public BigDecimal percent() {
    BigDecimal value = get().percent();
    return value == null ? BigDecimal.ZERO : value;
  }

  @Transactional
  public Response save(Request request) {
    BigDecimal value = request == null ? null : request.percent();
    if (value == null || value.signum() <= 0 || value.compareTo(HUNDRED) > 0) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Indique uma percentagem maior que 0 e até 100");
    }
    if (value.stripTrailingZeros().scale() > 2) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "A percentagem não pode ter mais de duas casas decimais");
    }
    FineSettings entity = settings.findById(FineSettings.SINGLE_ID).orElseGet(FineSettings::new);
    entity.setLatePercent(value.setScale(2, RoundingMode.HALF_UP));
    settings.save(entity);
    return get();
  }

  @Transactional
  public Response delete() {
    settings.findById(FineSettings.SINGLE_ID).ifPresent(entity -> {
      entity.setLatePercent(null);
      settings.save(entity);
    });
    return get();
  }
}
