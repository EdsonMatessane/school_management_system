package mz.cacoin.exams;

import java.math.BigDecimal;
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
public class ExamSettingsService {
  private final ExamSettingsRepository settings;
  private final SystemSettingsRepository systemSettings;

  @Transactional
  public ExamSettingsResponse get() {
    return toResponse(findOrCreate());
  }

  @Transactional
  public ExamSettingsResponse update(ExamSettingsRequest request) {
    if (request == null) {
      throw badRequest("Indique as definições dos exames");
    }
    BigDecimal normalFee = validateFee(request.normalFee(), "exame normal");
    BigDecimal recurrenceFee = validateFee(request.recurrenceFee(), "exame de recorrência");
    BigDecimal specialFee = validateFee(request.specialFee(), "exame especial");
    validatePeriod(request.examPeriodStart(), request.examPeriodEnd(), "período de exame");
    validatePeriod(request.gradeReleaseStart(), request.gradeReleaseEnd(),
        "período de lançamento de notas");

    ExamSettings current = findOrCreate();
    current.setNormalFee(normalFee);
    current.setRecurrenceFee(recurrenceFee);
    current.setSpecialFee(specialFee);
    if (request.normalFeeActive() != null) {
      current.setNormalFeeActive(request.normalFeeActive());
    }
    if (request.recurrenceFeeActive() != null) {
      current.setRecurrenceFeeActive(request.recurrenceFeeActive());
    }
    if (request.specialFeeActive() != null) {
      current.setSpecialFeeActive(request.specialFeeActive());
    }
    current.setExamPeriodStart(request.examPeriodStart());
    current.setExamPeriodEnd(request.examPeriodEnd());
    current.setGradeReleaseStart(request.gradeReleaseStart());
    current.setGradeReleaseEnd(request.gradeReleaseEnd());
    return toResponse(settings.save(current));
  }

  @Transactional
  public BigDecimal feeFor(String examType) {
    ExamSettings current = findOrCreate();
    return switch (examType) {
      case "NORMAL" -> chargedFee(current.getNormalFee(), current.isNormalFeeActive());
      case "RECURRENCE" -> chargedFee(current.getRecurrenceFee(), current.isRecurrenceFeeActive());
      case "SPECIAL" -> chargedFee(current.getSpecialFee(), current.isSpecialFeeActive());
      default -> throw badRequest("O tipo de exame indicado não é válido");
    };
  }

  @Transactional
  public ExamSettingsResponse updateFee(String examType, ExamFeeRequest request) {
    if (request == null) throw badRequest("Indique o valor da taxa");
    boolean charge = request.charge() == null || request.charge();
    BigDecimal amount = null;
    if (charge) {
      amount = validateFee(request.amount(), examType);
      if (amount.signum() <= 0) throw badRequest("A taxa deve ser superior a zero");
    }
    ExamSettings current = findOrCreate();
    switch (examType) {
      case "NORMAL" -> {
        if (charge) current.setNormalFee(amount);
        current.setNormalFeeActive(charge);
      }
      case "RECURRENCE" -> {
        if (charge) current.setRecurrenceFee(amount);
        current.setRecurrenceFeeActive(charge);
      }
      case "SPECIAL" -> {
        if (charge) current.setSpecialFee(amount);
        current.setSpecialFeeActive(charge);
      }
      default -> throw badRequest("O tipo de exame indicado não é válido");
    }
    return toResponse(settings.save(current));
  }

  @Transactional
  public ExamSettingsResponse deleteFee(String examType) {
    ExamSettings current = findOrCreate();
    switch (examType) {
      case "NORMAL" -> {
        current.setNormalFee(BigDecimal.ZERO);
        current.setNormalFeeActive(false);
      }
      case "RECURRENCE" -> {
        current.setRecurrenceFee(BigDecimal.ZERO);
        current.setRecurrenceFeeActive(false);
      }
      case "SPECIAL" -> {
        current.setSpecialFee(BigDecimal.ZERO);
        current.setSpecialFeeActive(false);
      }
      default -> throw badRequest("O tipo de exame indicado não é válido");
    }
    return toResponse(settings.save(current));
  }

  @Transactional
  public ExamSettingsResponse setFeeActive(
      String examType, ExamFeeActivationRequest request) {
    if (request == null || request.active() == null) {
      throw badRequest("Indique o estado da taxa");
    }
    ExamSettings current = findOrCreate();
    switch (examType) {
      case "NORMAL" -> {
        ensureCanActivate(current.getNormalFee(), request.active());
        current.setNormalFeeActive(request.active());
      }
      case "RECURRENCE" -> {
        ensureCanActivate(current.getRecurrenceFee(), request.active());
        current.setRecurrenceFeeActive(request.active());
      }
      case "SPECIAL" -> {
        ensureCanActivate(current.getSpecialFee(), request.active());
        current.setSpecialFeeActive(request.active());
      }
      default -> throw badRequest("O tipo de exame indicado não é válido");
    }
    return toResponse(settings.save(current));
  }

  @Transactional
  public void requireExamPeriodOpen() {
    ExamSettings current = findOrCreate();
    requireOpen(current.getExamPeriodStart(), current.getExamPeriodEnd(),
        "As inscrições só podem ser feitas durante o período de exame configurado");
  }

  @Transactional
  public void requireGradeReleasePeriodOpen() {
    ExamSettings current = findOrCreate();
    requireOpen(current.getGradeReleaseStart(), current.getGradeReleaseEnd(),
        "O lançamento de notas só está disponível durante o período configurado");
  }

  private ExamSettings findOrCreate() {
    return settings.findById(1L).orElseGet(() -> settings.save(new ExamSettings()));
  }

  private BigDecimal validateFee(BigDecimal value, String label) {
    if (value == null || value.signum() < 0 || value.scale() > 2 || value.precision() > 12) {
      throw badRequest("A taxa do " + label + " não pode ser negativa e deve ter até duas casas decimais");
    }
    return value.setScale(2);
  }

  /** Só cobra quando a taxa está activa e é superior a zero; caso contrário não há cobrança. */
  private BigDecimal chargedFee(BigDecimal fee, boolean active) {
    if (!active || fee == null || fee.signum() <= 0) return BigDecimal.ZERO.setScale(2);
    return fee;
  }

  private void ensureCanActivate(BigDecimal fee, boolean active) {
    if (active && fee.signum() <= 0) {
      throw badRequest("Defina uma taxa superior a zero antes de activar");
    }
  }

  private void validatePeriod(LocalDateTime start, LocalDateTime end, String label) {
    if ((start == null) != (end == null)) {
      throw badRequest("Indique a data inicial e final do " + label + ", ou deixe ambas vazias");
    }
    if (start != null && !start.isBefore(end)) {
      throw badRequest("A data final do " + label + " deve ser posterior à data inicial");
    }
  }

  private void requireOpen(LocalDateTime start, LocalDateTime end, String message) {
    if (start == null || end == null) return;
    String timeZone = systemSettings.findById(1L)
        .map(setting -> setting.getTimeZone())
        .orElse("Africa/Maputo");
    LocalDateTime now = LocalDateTime.now(ZoneId.of(timeZone));
    if (now.isBefore(start) || now.isAfter(end)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
  }

  private ExamSettingsResponse toResponse(ExamSettings value) {
    return new ExamSettingsResponse(
        value.getNormalFee(),
        value.getRecurrenceFee(),
        value.getSpecialFee(),
        value.isNormalFeeActive() && value.getNormalFee().signum() > 0,
        value.isRecurrenceFeeActive() && value.getRecurrenceFee().signum() > 0,
        value.isSpecialFeeActive() && value.getSpecialFee().signum() > 0,
        value.getExamPeriodStart(),
        value.getExamPeriodEnd(),
        value.getGradeReleaseStart(),
        value.getGradeReleaseEnd());
  }

  private ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
