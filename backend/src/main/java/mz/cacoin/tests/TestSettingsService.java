package mz.cacoin.tests;

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
public class TestSettingsService {
  private final TestSettingsRepository settings;
  private final SystemSettingsRepository systemSettings;

  @Transactional
  public TestSettingsResponse get() {
    return toResponse(findOrCreate());
  }

  @Transactional
  public TestSettingsResponse update(TestSettingsRequest request) {
    if (request == null) {
      throw badRequest("Indique as definições dos testes");
    }
    BigDecimal normalFee = validateFee(request.normalFee(), "teste normal");
    BigDecimal recoveryFee = validateFee(request.recoveryFee(), "teste de recuperação");
    BigDecimal specialFee = validateFee(request.specialFee(), "teste especial");
    validatePeriod(request.testPeriodStart(), request.testPeriodEnd(), "período de teste");
    validatePeriod(request.gradeReleaseStart(), request.gradeReleaseEnd(),
        "período de lançamento de notas");

    TestSettings current = findOrCreate();
    current.setNormalFee(normalFee);
    current.setRecoveryFee(recoveryFee);
    current.setSpecialFee(specialFee);
    if (request.normalFeeActive() != null) {
      current.setNormalFeeActive(request.normalFeeActive());
    }
    if (request.recoveryFeeActive() != null) {
      current.setRecoveryFeeActive(request.recoveryFeeActive());
    }
    if (request.specialFeeActive() != null) {
      current.setSpecialFeeActive(request.specialFeeActive());
    }
    current.setTestPeriodStart(request.testPeriodStart());
    current.setTestPeriodEnd(request.testPeriodEnd());
    current.setGradeReleaseStart(request.gradeReleaseStart());
    current.setGradeReleaseEnd(request.gradeReleaseEnd());
    return toResponse(settings.save(current));
  }

  @Transactional
  public BigDecimal feeFor(String testType) {
    TestSettings current = findOrCreate();
    return switch (testType) {
      case "NORMAL" -> chargedFee(current.getNormalFee(), current.isNormalFeeActive());
      case "RECOVERY" -> chargedFee(current.getRecoveryFee(), current.isRecoveryFeeActive());
      case "SPECIAL" -> chargedFee(current.getSpecialFee(), current.isSpecialFeeActive());
      default -> throw badRequest("O tipo de teste indicado não é válido");
    };
  }

  @Transactional
  public TestSettingsResponse updateFee(String testType, TestFeeRequest request) {
    if (request == null) throw badRequest("Indique o valor da taxa");
    boolean charge = request.charge() == null || request.charge();
    BigDecimal amount = null;
    if (charge) {
      amount = validateFee(request.amount(), testType);
      if (amount.signum() <= 0) throw badRequest("A taxa deve ser superior a zero");
    }
    TestSettings current = findOrCreate();
    switch (testType) {
      case "NORMAL" -> {
        if (charge) current.setNormalFee(amount);
        current.setNormalFeeActive(charge);
      }
      case "RECOVERY" -> {
        if (charge) current.setRecoveryFee(amount);
        current.setRecoveryFeeActive(charge);
      }
      case "SPECIAL" -> {
        if (charge) current.setSpecialFee(amount);
        current.setSpecialFeeActive(charge);
      }
      default -> throw badRequest("O tipo de teste indicado não é válido");
    }
    return toResponse(settings.save(current));
  }

  @Transactional
  public TestSettingsResponse deleteFee(String testType) {
    TestSettings current = findOrCreate();
    switch (testType) {
      case "NORMAL" -> {
        current.setNormalFee(BigDecimal.ZERO);
        current.setNormalFeeActive(false);
      }
      case "RECOVERY" -> {
        current.setRecoveryFee(BigDecimal.ZERO);
        current.setRecoveryFeeActive(false);
      }
      case "SPECIAL" -> {
        current.setSpecialFee(BigDecimal.ZERO);
        current.setSpecialFeeActive(false);
      }
      default -> throw badRequest("O tipo de teste indicado não é válido");
    }
    return toResponse(settings.save(current));
  }

  @Transactional
  public TestSettingsResponse setFeeActive(
      String testType, TestFeeActivationRequest request) {
    if (request == null || request.active() == null) {
      throw badRequest("Indique o estado da taxa");
    }
    TestSettings current = findOrCreate();
    switch (testType) {
      case "NORMAL" -> {
        ensureCanActivate(current.getNormalFee(), request.active());
        current.setNormalFeeActive(request.active());
      }
      case "RECOVERY" -> {
        ensureCanActivate(current.getRecoveryFee(), request.active());
        current.setRecoveryFeeActive(request.active());
      }
      case "SPECIAL" -> {
        ensureCanActivate(current.getSpecialFee(), request.active());
        current.setSpecialFeeActive(request.active());
      }
      default -> throw badRequest("O tipo de teste indicado não é válido");
    }
    return toResponse(settings.save(current));
  }

  @Transactional
  public void requireTestPeriodOpen() {
    TestSettings current = findOrCreate();
    requireOpen(current.getTestPeriodStart(), current.getTestPeriodEnd(),
        "As inscrições só podem ser feitas durante o período de teste configurado");
  }

  @Transactional
  public void requireGradeReleasePeriodOpen() {
    TestSettings current = findOrCreate();
    requireOpen(current.getGradeReleaseStart(), current.getGradeReleaseEnd(),
        "O lançamento de notas só está disponível durante o período configurado");
  }

  private TestSettings findOrCreate() {
    return settings.findById(1L).orElseGet(() -> settings.save(new TestSettings()));
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

  private TestSettingsResponse toResponse(TestSettings value) {
    return new TestSettingsResponse(
        value.getNormalFee(),
        value.getRecoveryFee(),
        value.getSpecialFee(),
        value.isNormalFeeActive() && value.getNormalFee().signum() > 0,
        value.isRecoveryFeeActive() && value.getRecoveryFee().signum() > 0,
        value.isSpecialFeeActive() && value.getSpecialFee().signum() > 0,
        value.getTestPeriodStart(),
        value.getTestPeriodEnd(),
        value.getGradeReleaseStart(),
        value.getGradeReleaseEnd());
  }

  private ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
