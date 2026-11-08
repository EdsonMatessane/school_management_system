package mz.cacoin.finance;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import mz.cacoin.settings.SystemSettingsRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class FinanceSettingsService {
  static final String FULL = "FULL";
  static final String PARTIAL = "PARTIAL";
  static final int MAX_ADVANCE_MONTHS = 12;

  private final FinanceSettingsRepository settings;
  private final SystemSettingsRepository systemSettings;

  @Transactional
  public FinanceSettingsResponse get() {
    return toResponse(findOrCreate());
  }

  @Transactional
  public String paymentRule() {
    return findOrCreate().getPaymentRule();
  }

  @Transactional
  public int maxAdvanceMonths() {
    return findOrCreate().getMaxAdvanceMonths();
  }

  @Transactional
  public FinanceSettingsResponse updatePeriod(FinancePeriodRequest request) {
    if (request == null) {
      throw badRequest("Indique o período de processamento de salário");
    }
    LocalDateTime start = request.periodStart();
    LocalDateTime end = request.periodEnd();
    if ((start == null) != (end == null)) {
      throw badRequest("Indique o início e o fim do período de processamento de salário");
    }
    if (start != null && !start.isBefore(end)) {
      throw badRequest("O fim do período de processamento deve ser posterior ao início");
    }
    FinanceSettings current = findOrCreate();
    current.setProcessingPeriodStart(start);
    current.setProcessingPeriodEnd(end);
    return toResponse(settings.save(current));
  }

  @Transactional
  public FinanceSettingsResponse updateRules(FinanceRulesRequest request) {
    if (request == null) {
      throw badRequest("Indique as regras de pagamento e de adiantamento");
    }
    String rule = request.paymentRule() == null
        ? ""
        : request.paymentRule().trim().toUpperCase(Locale.ROOT);
    if (!FULL.equals(rule) && !PARTIAL.equals(rule)) {
      throw badRequest("A regra de pagamento deve ser parcial ou completo");
    }
    Integer months = request.maxAdvanceMonths();
    if (months == null || months < 0 || months > MAX_ADVANCE_MONTHS) {
      throw badRequest("O adiantamento deve estar entre 0 e " + MAX_ADVANCE_MONTHS + " meses");
    }
    FinanceSettings current = findOrCreate();
    current.setPaymentRule(rule);
    current.setMaxAdvanceMonths(months);
    return toResponse(settings.save(current));
  }

  @Transactional
  public void requireProcessingPeriodOpen() {
    FinanceSettings current = findOrCreate();
    LocalDateTime start = current.getProcessingPeriodStart();
    LocalDateTime end = current.getProcessingPeriodEnd();
    if (start == null || end == null) return;
    String timeZone = systemSettings.findById(1L)
        .map(setting -> setting.getTimeZone())
        .orElse("Africa/Maputo");
    LocalDateTime now = LocalDateTime.now(ZoneId.of(timeZone));
    if (now.isBefore(start) || now.isAfter(end)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "O processamento de salários só está disponível durante o período configurado");
    }
  }

  private FinanceSettings findOrCreate() {
    return settings.findById(1L).orElseGet(() -> settings.save(new FinanceSettings()));
  }

  private FinanceSettingsResponse toResponse(FinanceSettings value) {
    return new FinanceSettingsResponse(
        value.getProcessingPeriodStart(),
        value.getProcessingPeriodEnd(),
        value.getPaymentRule(),
        value.getMaxAdvanceMonths());
  }

  private ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
