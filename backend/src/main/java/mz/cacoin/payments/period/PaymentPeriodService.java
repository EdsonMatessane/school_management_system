package mz.cacoin.payments.period;

import mz.cacoin.settings.SystemDate;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import mz.cacoin.common.TextNormalizer;
import mz.cacoin.settings.Holiday;
import mz.cacoin.settings.HolidayRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class PaymentPeriodService {
  private static final Set<String> ADJUSTMENTS =
      Set.of("NONE", "NEXT_BUSINESS_DAY", "PREVIOUS_BUSINESS_DAY");
  private static final Set<String> FIRST_MONTH_POLICIES =
      Set.of("ENROLLMENT_DATE_IF_LATE", "PATTERN_DAY");
  private static final DateTimeFormatter PERIOD_FORMAT = DateTimeFormatter.ofPattern("MM/yyyy");
  private static final int DEFAULT_PREVIEW_MONTHS = 6;
  private static final int MAX_PREVIEW_MONTHS = 24;

  private final PaymentPeriodSettingsRepository repository;
  private final HolidayRepository holidays;

  @Transactional
  public PaymentPeriodResponse get() {
    return toResponse(current());
  }

  /** Configuração guardada; é criada com os valores por omissão na primeira utilização. */
  @Transactional
  public PaymentPeriodSettings current() {
    return repository.findById(1L).orElseGet(() -> repository.save(new PaymentPeriodSettings()));
  }

  @Transactional
  public PaymentPeriodResponse update(PaymentPeriodRequest request) {
    PaymentPeriodSettings settings = current();
    apply(settings, request, settings);
    return toResponse(repository.save(settings));
  }

  /** Regras em vigor (com os feriados activos), usadas para calcular as datas limite. */
  @Transactional
  public PaymentPeriodRules rules() {
    return rulesFor(current());
  }

  /** Mostra como ficam os próximos meses com os valores do pedido, sem os guardar. */
  @Transactional
  public List<PaymentPeriodPreviewItem> preview(PaymentPeriodRequest request, Integer months) {
    PaymentPeriodSettings candidate = new PaymentPeriodSettings();
    apply(candidate, request, current());
    int count = months == null ? DEFAULT_PREVIEW_MONTHS : months;
    if (count < 1 || count > MAX_PREVIEW_MONTHS) {
      throw badRequest("O número de meses da pré-visualização deve estar entre 1 e "
          + MAX_PREVIEW_MONTHS);
    }
    return rulesFor(candidate).preview(YearMonth.from(SystemDate.today()), count).stream()
        .map(entry -> new PaymentPeriodPreviewItem(
            entry.month().format(PERIOD_FORMAT),
            entry.referenceDate(),
            entry.dueDate(),
            entry.overdueFrom(),
            entry.note()))
        .toList();
  }

  private PaymentPeriodRules rulesFor(PaymentPeriodSettings settings) {
    List<PaymentPeriodRules.HolidayDay> days = settings.isHolidaysNonBusiness()
        ? holidays.findAll().stream()
            .filter(Holiday::isActive)
            .map(holiday -> new PaymentPeriodRules.HolidayDay(
                holiday.getDate(),
                TextNormalizer.toDisplay(holiday.getName()),
                holiday.isRecurring()))
            .toList()
        : List.of();
    return new PaymentPeriodRules(
        new PaymentPeriodRules.Config(
            settings.getDueDay(),
            settings.getGraceDays(),
            PaymentPeriodRules.Adjustment.valueOf(settings.getNonBusinessAdjustment()),
            settings.isSaturdayNonBusiness(),
            settings.isSundayNonBusiness(),
            settings.isHolidaysNonBusiness(),
            PaymentPeriodRules.FirstMonthPolicy.valueOf(settings.getFirstMonthPolicy())),
        days);
  }

  /** Valida o pedido e copia-o para {@code target}; campos em falta mantêm o valor de {@code base}. */
  private void apply(
      PaymentPeriodSettings target, PaymentPeriodRequest request, PaymentPeriodSettings base) {
    if (request == null) {
      throw badRequest("Indique as regras do período de pagamento");
    }
    int dueDay = request.dueDay() == null ? base.getDueDay() : request.dueDay();
    int graceDays = request.graceDays() == null ? base.getGraceDays() : request.graceDays();
    String adjustment = request.nonBusinessAdjustment() == null
        ? base.getNonBusinessAdjustment()
        : request.nonBusinessAdjustment().trim().toUpperCase();
    String firstMonthPolicy = request.firstMonthPolicy() == null
        ? base.getFirstMonthPolicy()
        : request.firstMonthPolicy().trim().toUpperCase();
    if (dueDay < 1 || dueDay > 31) {
      throw badRequest("O dia de pagamento deve estar entre 1 e 31");
    }
    if (graceDays < 0 || graceDays > 90) {
      throw badRequest("Os dias de tolerância devem estar entre 0 e 90");
    }
    if (!ADJUSTMENTS.contains(adjustment)) {
      throw badRequest("A regra para fins de semana e feriados é inválida");
    }
    if (!FIRST_MONTH_POLICIES.contains(firstMonthPolicy)) {
      throw badRequest("A regra do primeiro mês é inválida");
    }
    target.setDueDay(dueDay);
    target.setGraceDays(graceDays);
    target.setNonBusinessAdjustment(adjustment);
    target.setSaturdayNonBusiness(request.saturdayNonBusiness() == null
        ? base.isSaturdayNonBusiness()
        : request.saturdayNonBusiness());
    target.setSundayNonBusiness(request.sundayNonBusiness() == null
        ? base.isSundayNonBusiness()
        : request.sundayNonBusiness());
    target.setHolidaysNonBusiness(request.holidaysNonBusiness() == null
        ? base.isHolidaysNonBusiness()
        : request.holidaysNonBusiness());
    target.setFirstMonthPolicy(firstMonthPolicy);
  }

  private PaymentPeriodResponse toResponse(PaymentPeriodSettings settings) {
    return new PaymentPeriodResponse(
        settings.getId(),
        settings.getDueDay(),
        settings.getGraceDays(),
        settings.getNonBusinessAdjustment(),
        settings.isSaturdayNonBusiness(),
        settings.isSundayNonBusiness(),
        settings.isHolidaysNonBusiness(),
        settings.getFirstMonthPolicy());
  }

  private ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
