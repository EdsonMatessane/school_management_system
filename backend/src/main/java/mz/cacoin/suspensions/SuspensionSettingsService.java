package mz.cacoin.suspensions;

import java.math.BigDecimal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class SuspensionSettingsService {
  private static final BigDecimal MAX_FEE = new BigDecimal("9999999999.99");

  private final SuspensionSettingsRepository settings;

  @Transactional
  public SuspensionSettingsResponse get() {
    return toResponse(findOrCreate());
  }

  @Transactional
  public BigDecimal activeFee() {
    SuspensionSettings current = findOrCreate();
    return current.isFeeActive() ? current.getFee() : BigDecimal.ZERO;
  }

  @Transactional
  public SuspensionSettingsResponse updateFee(SuspensionFeeRequest request) {
    if (request == null || request.amount() == null) {
      throw badRequest("Indique o valor da taxa de trancamento");
    }
    BigDecimal amount = request.amount();
    if (amount.signum() <= 0 || amount.scale() > 2 || amount.compareTo(MAX_FEE) > 0) {
      throw badRequest("A taxa deve ser superior a zero, com no máximo duas casas decimais");
    }
    SuspensionSettings current = findOrCreate();
    current.setFee(amount);
    current.setFeeActive(true);
    return toResponse(settings.save(current));
  }

  @Transactional
  public SuspensionSettingsResponse deleteFee() {
    SuspensionSettings current = findOrCreate();
    current.setFee(BigDecimal.ZERO);
    current.setFeeActive(false);
    return toResponse(settings.save(current));
  }

  @Transactional
  public SuspensionSettingsResponse setFeeActive(SuspensionFeeActivationRequest request) {
    if (request == null || request.active() == null) {
      throw badRequest("Indique o estado da taxa");
    }
    SuspensionSettings current = findOrCreate();
    if (request.active() && current.getFee().signum() <= 0) {
      throw badRequest("Defina uma taxa superior a zero antes de a ativar");
    }
    current.setFeeActive(request.active());
    return toResponse(settings.save(current));
  }

  private SuspensionSettings findOrCreate() {
    return settings.findById(1L).orElseGet(() -> settings.save(new SuspensionSettings()));
  }

  private SuspensionSettingsResponse toResponse(SuspensionSettings value) {
    return new SuspensionSettingsResponse(value.getFee(), value.isFeeActive());
  }

  private ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
