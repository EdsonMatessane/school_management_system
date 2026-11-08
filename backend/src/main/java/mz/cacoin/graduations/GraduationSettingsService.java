package mz.cacoin.graduations;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import mz.cacoin.settings.SystemSettingsRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class GraduationSettingsService {
  static final int MAX_GUESTS = 50;
  private static final BigDecimal MAX_FEE = new BigDecimal("9999999999.99");

  private final GraduationSettingsRepository settings;
  private final GraduationRequirementRepository requirements;
  private final SystemSettingsRepository systemSettings;

  @Transactional
  public GraduationSettingsResponse get() {
    return toResponse(findOrCreate());
  }

  @Transactional
  public GraduationSettingsResponse update(GraduationSettingsRequest request) {
    if (request == null) {
      throw badRequest("Indique as definições da graduação");
    }
    BigDecimal graduationFee = validFee(request.graduationFee(), "taxa de graduação");
    BigDecimal extraGuestFee = validFee(request.extraGuestFee(), "valor por convidado extra");
    BigDecimal specialExamFee = validFee(request.specialExamFee(), "taxa de exame especial");
    int guests = validGuests(request.includedGuests());
    GraduationSettings current = findOrCreate();
    current.setGraduationFee(graduationFee);
    current.setGraduationFeeActive(true);
    current.setExtraGuestFee(extraGuestFee);
    current.setExtraGuestFeeActive(true);
    current.setSpecialExamFee(specialExamFee);
    current.setSpecialExamFeeActive(true);
    current.setIncludedGuests(guests);
    return toResponse(settings.save(current));
  }

  @Transactional
  public GraduationSettingsResponse updateFee(String key, GraduationFeeRequest request) {
    BigDecimal amount = validFee(request == null ? null : request.amount(), "taxa");
    GraduationSettings current = findOrCreate();
    switch (normalizeKey(key)) {
      case "GRADUATION" -> {
        current.setGraduationFee(amount);
        current.setGraduationFeeActive(true);
      }
      case "EXTRA_GUEST" -> {
        current.setExtraGuestFee(amount);
        current.setExtraGuestFeeActive(true);
      }
      default -> {
        current.setSpecialExamFee(amount);
        current.setSpecialExamFeeActive(true);
      }
    }
    return toResponse(settings.save(current));
  }

  @Transactional
  public GraduationSettingsResponse deleteFee(String key) {
    GraduationSettings current = findOrCreate();
    switch (normalizeKey(key)) {
      case "GRADUATION" -> {
        current.setGraduationFee(BigDecimal.ZERO);
        current.setGraduationFeeActive(false);
      }
      case "EXTRA_GUEST" -> {
        current.setExtraGuestFee(BigDecimal.ZERO);
        current.setExtraGuestFeeActive(false);
      }
      default -> {
        current.setSpecialExamFee(BigDecimal.ZERO);
        current.setSpecialExamFeeActive(false);
      }
    }
    return toResponse(settings.save(current));
  }

  @Transactional
  public GraduationSettingsResponse setFeeActive(String key, GraduationFeeActivationRequest request) {
    if (request == null || request.active() == null) {
      throw badRequest("Indique o estado da taxa");
    }
    boolean active = request.active();
    GraduationSettings current = findOrCreate();
    switch (normalizeKey(key)) {
      case "GRADUATION" -> {
        requirePositiveToActivate(active, current.getGraduationFee());
        current.setGraduationFeeActive(active);
      }
      case "EXTRA_GUEST" -> {
        requirePositiveToActivate(active, current.getExtraGuestFee());
        current.setExtraGuestFeeActive(active);
      }
      default -> {
        requirePositiveToActivate(active, current.getSpecialExamFee());
        current.setSpecialExamFeeActive(active);
      }
    }
    return toResponse(settings.save(current));
  }

  @Transactional
  public GraduationSettingsResponse updateGuests(GraduationGuestsRequest request) {
    int guests = validGuests(request == null ? null : request.includedGuests());
    GraduationSettings current = findOrCreate();
    current.setIncludedGuests(guests);
    return toResponse(settings.save(current));
  }

  @Transactional
  public GraduationSettingsResponse updatePeriod(GraduationPeriodRequest request) {
    if (request == null) {
      throw badRequest("Indique o período de graduação");
    }
    LocalDateTime start = request.periodStart();
    LocalDateTime end = request.periodEnd();
    if ((start == null) != (end == null)) {
      throw badRequest("Indique o início e o fim do período de graduação");
    }
    if (start != null && !start.isBefore(end)) {
      throw badRequest("O fim do período de graduação deve ser posterior ao início");
    }
    GraduationSettings current = findOrCreate();
    current.setPeriodStart(start);
    current.setPeriodEnd(end);
    return toResponse(settings.save(current));
  }

  @Transactional
  public GraduationSettingsResponse updateDay(GraduationDayRequest request) {
    if (request == null || request.date() == null
        || request.startTime() == null || request.endTime() == null) {
      throw badRequest("Indique o dia, a hora de início e a hora de fim da graduação");
    }
    if (!request.startTime().isBefore(request.endTime())) {
      throw badRequest("A hora de fim da graduação deve ser posterior à hora de início");
    }
    GraduationSettings current = findOrCreate();
    current.setCeremonyDate(request.date());
    current.setCeremonyStartTime(request.startTime());
    current.setCeremonyEndTime(request.endTime());
    return toResponse(settings.save(current));
  }

  @Transactional
  public void requireRegistrationPeriodOpen() {
    GraduationSettings current = findOrCreate();
    LocalDateTime start = current.getPeriodStart();
    LocalDateTime end = current.getPeriodEnd();
    if (start == null || end == null) return;
    String timeZone = systemSettings.findById(1L)
        .map(setting -> setting.getTimeZone())
        .orElse("Africa/Maputo");
    LocalDateTime now = LocalDateTime.now(ZoneId.of(timeZone));
    if (now.isBefore(start) || now.isAfter(end)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "As inscrições só podem ser feitas durante o período de graduação configurado");
    }
  }

  @Transactional
  public GraduationQuote quote(int guests) {
    GraduationSettings current = findOrCreate();
    BigDecimal fee = current.isGraduationFeeActive() ? current.getGraduationFee() : BigDecimal.ZERO;
    if (fee.signum() <= 0) {
      throw badRequest("Configure uma taxa de graduação válida antes de inscrever estudantes");
    }
    int extraGuests = Math.max(0, guests - current.getIncludedGuests());
    BigDecimal extraFee =
        current.isExtraGuestFeeActive() ? current.getExtraGuestFee() : BigDecimal.ZERO;
    if (extraGuests > 0 && extraFee.signum() <= 0) {
      throw badRequest("Configure o valor por convidado extra para inscrever mais de "
          + current.getIncludedGuests() + " convidados");
    }
    BigDecimal requirementsAmount = requirementsTotal();
    BigDecimal extraAmount = extraFee.multiply(BigDecimal.valueOf(extraGuests));
    return new GraduationQuote(
        fee,
        requirementsAmount,
        extraGuests,
        extraAmount,
        fee.add(requirementsAmount).add(extraAmount));
  }

  private BigDecimal requirementsTotal() {
    return requirements.findAllByOrderByIdAsc().stream()
        .map(GraduationRequirement::getAmount)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  private GraduationSettings findOrCreate() {
    return settings.findById(1L).orElseGet(() -> settings.save(new GraduationSettings()));
  }

  private String normalizeKey(String key) {
    String normalized = key == null ? "" : key.trim().toUpperCase(Locale.ROOT);
    if (!List.of("GRADUATION", "EXTRA_GUEST", "SPECIAL_EXAM").contains(normalized)) {
      throw badRequest("O tipo de taxa indicado é inválido");
    }
    return normalized;
  }

  private BigDecimal validFee(BigDecimal amount, String label) {
    if (amount == null || amount.signum() <= 0
        || amount.scale() > 2 || amount.compareTo(MAX_FEE) > 0) {
      throw badRequest("A " + label + " deve ser superior a zero, com no máximo duas casas decimais");
    }
    return amount;
  }

  private int validGuests(Integer guests) {
    if (guests == null || guests < 0 || guests > MAX_GUESTS) {
      throw badRequest("O número de convidados deve estar entre 0 e " + MAX_GUESTS);
    }
    return guests;
  }

  private void requirePositiveToActivate(boolean active, BigDecimal amount) {
    if (active && amount.signum() <= 0) {
      throw badRequest("Defina uma taxa superior a zero antes de a ativar");
    }
  }

  private GraduationSettingsResponse toResponse(GraduationSettings value) {
    List<GraduationRequirementResponse> items = requirements.findAllByOrderByIdAsc().stream()
        .map(item -> new GraduationRequirementResponse(
            item.getId(), item.getName(), item.getAmount()))
        .toList();
    BigDecimal total = items.stream()
        .map(GraduationRequirementResponse::amount)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
    return new GraduationSettingsResponse(
        value.getGraduationFee(),
        value.isGraduationFeeActive(),
        value.getIncludedGuests(),
        value.getExtraGuestFee(),
        value.isExtraGuestFeeActive(),
        value.getSpecialExamFee(),
        value.isSpecialExamFeeActive(),
        value.getPeriodStart(),
        value.getPeriodEnd(),
        value.getCeremonyDate(),
        value.getCeremonyStartTime(),
        value.getCeremonyEndTime(),
        items,
        total);
  }

  private ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
