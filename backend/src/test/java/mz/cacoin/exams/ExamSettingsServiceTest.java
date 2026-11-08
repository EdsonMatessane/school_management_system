package mz.cacoin.exams;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import mz.cacoin.settings.SystemSettingsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class ExamSettingsServiceTest {
  private ExamSettingsRepository repository;
  private ExamSettingsService service;
  private ExamSettings current;

  @BeforeEach
  void setUp() {
    repository = org.mockito.Mockito.mock(ExamSettingsRepository.class);
    service = new ExamSettingsService(
        repository, org.mockito.Mockito.mock(SystemSettingsRepository.class));
    current = new ExamSettings();
    when(repository.findById(1L)).thenReturn(Optional.of(current));
    when(repository.save(any(ExamSettings.class))).thenAnswer(invocation -> invocation.getArgument(0));
  }

  @Test
  void deletingFeeClearsItAndDisablesNewRegistrations() {
    current.setNormalFee(new BigDecimal("300.00"));

    ExamSettingsResponse response = service.deleteFee("NORMAL");

    assertEquals(BigDecimal.ZERO, response.normalFee());
    assertFalse(response.normalFeeActive());
    assertEquals(0, service.feeFor("NORMAL").signum());
  }

  @Test
  void editingFeeSetsAmountAndActivatesIt() {
    current.setRecurrenceFeeActive(false);

    ExamSettingsResponse response =
        service.updateFee("RECURRENCE", new ExamFeeRequest(new BigDecimal("250.00")));

    assertEquals(new BigDecimal("250.00"), response.recurrenceFee());
    assertTrue(response.recurrenceFeeActive());
    assertEquals(new BigDecimal("250.00"), service.feeFor("RECURRENCE"));
  }

  @Test
  void activationRequiresPositiveFee() {
    ResponseStatusException exception = assertThrows(
        ResponseStatusException.class,
        () -> service.setFeeActive("SPECIAL", new ExamFeeActivationRequest(true)));

    assertEquals(400, exception.getStatusCode().value());
    verify(repository).findById(1L);
    verify(repository, never()).save(any(ExamSettings.class));
  }

  @Test
  void feeForRejectsUnknownExamType() {
    ResponseStatusException exception =
        assertThrows(ResponseStatusException.class, () -> service.feeFor("RECOVERY"));

    assertEquals(400, exception.getStatusCode().value());
  }

  @Test
  void periodMustHaveBothDatesAndEndAfterStart() {
    LocalDateTime start = LocalDateTime.of(2026, 11, 1, 8, 0);
    ExamSettingsRequest onlyStart = new ExamSettingsRequest(
        new BigDecimal("100.00"), new BigDecimal("100.00"), new BigDecimal("100.00"),
        true, true, true, start, null, null, null);
    ExamSettingsRequest endBeforeStart = new ExamSettingsRequest(
        new BigDecimal("100.00"), new BigDecimal("100.00"), new BigDecimal("100.00"),
        true, true, true, start, start.minusDays(1), null, null);

    assertEquals(400, assertThrows(
        ResponseStatusException.class, () -> service.update(onlyStart)).getStatusCode().value());
    assertEquals(400, assertThrows(
        ResponseStatusException.class, () -> service.update(endBeforeStart)).getStatusCode().value());
    verify(repository, never()).save(any(ExamSettings.class));
  }

  @Test
  void gradeReleasePeriodMustHaveBothDates() {
    LocalDateTime start = LocalDateTime.of(2026, 12, 1, 8, 0);
    ExamSettingsRequest onlyStart = new ExamSettingsRequest(
        new BigDecimal("100.00"), new BigDecimal("100.00"), new BigDecimal("100.00"),
        true, true, true, null, null, start, null);

    assertEquals(400, assertThrows(
        ResponseStatusException.class, () -> service.update(onlyStart)).getStatusCode().value());
    verify(repository, never()).save(any(ExamSettings.class));
  }

  @Test
  void updateStoresFeesAndPeriod() {
    LocalDateTime start = LocalDateTime.of(2026, 11, 1, 8, 0);
    LocalDateTime end = LocalDateTime.of(2026, 11, 30, 17, 0);

    ExamSettingsResponse response = service.update(new ExamSettingsRequest(
        new BigDecimal("200.00"), new BigDecimal("150.00"), new BigDecimal("300.00"),
        true, true, true, start, end, start.plusDays(40), end.plusDays(40)));

    assertEquals(new BigDecimal("200.00"), response.normalFee());
    assertEquals(new BigDecimal("150.00"), response.recurrenceFee());
    assertEquals(new BigDecimal("300.00"), response.specialFee());
    assertEquals(start, response.examPeriodStart());
    assertEquals(end, response.examPeriodEnd());
    assertEquals(start.plusDays(40), response.gradeReleaseStart());
    assertEquals(end.plusDays(40), response.gradeReleaseEnd());
  }

  @Test
  void feesAreFreeByDefault() {
    assertEquals(0, service.feeFor("NORMAL").signum());
    assertEquals(0, service.feeFor("SPECIAL").signum());
    assertFalse(service.get().normalFeeActive());
  }

  @Test
  void switchingToNoChargeKeepsAmountButStopsCharging() {
    service.updateFee("NORMAL", new ExamFeeRequest(new BigDecimal("250.00"), true));

    ExamSettingsResponse response =
        service.updateFee("NORMAL", new ExamFeeRequest(null, false));

    assertFalse(response.normalFeeActive());
    assertEquals(0, service.feeFor("NORMAL").signum());
  }

  @Test
  void chargingRequiresPositiveAmount() {
    ResponseStatusException exception = assertThrows(
        ResponseStatusException.class,
        () -> service.updateFee("NORMAL", new ExamFeeRequest(BigDecimal.ZERO, true)));

    assertEquals(400, exception.getStatusCode().value());
  }
}
