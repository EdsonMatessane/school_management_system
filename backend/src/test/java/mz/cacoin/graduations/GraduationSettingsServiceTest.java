package mz.cacoin.graduations;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import mz.cacoin.settings.SystemSettingsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class GraduationSettingsServiceTest {
  private GraduationSettingsRepository repository;
  private GraduationRequirementRepository requirements;
  private GraduationSettingsService service;
  private GraduationSettings current;

  @BeforeEach
  void setUp() {
    repository = mock(GraduationSettingsRepository.class);
    requirements = mock(GraduationRequirementRepository.class);
    service = new GraduationSettingsService(
        repository, requirements, mock(SystemSettingsRepository.class));
    current = new GraduationSettings();
    when(repository.findById(1L)).thenReturn(Optional.of(current));
    when(repository.save(any(GraduationSettings.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    when(requirements.findAllByOrderByIdAsc()).thenReturn(List.of());
  }

  private GraduationRequirement requirement(String name, String amount) {
    GraduationRequirement item = new GraduationRequirement();
    item.setName(name);
    item.setAmount(new BigDecimal(amount));
    return item;
  }

  private void configure(String fee, int guests, String extraFee) {
    current.setGraduationFee(new BigDecimal(fee));
    current.setIncludedGuests(guests);
    current.setExtraGuestFee(new BigDecimal(extraFee));
  }

  @Test
  void updateStoresAllFeesAndIncludedGuests() {
    GraduationSettingsResponse response = service.update(new GraduationSettingsRequest(
        new BigDecimal("2500.00"), 2, new BigDecimal("300.00"), new BigDecimal("1200.00")));

    assertEquals(new BigDecimal("2500.00"), response.graduationFee());
    assertEquals(2, response.includedGuests());
    assertEquals(new BigDecimal("300.00"), response.extraGuestFee());
    assertEquals(new BigDecimal("1200.00"), response.specialExamFee());
    assertTrue(response.graduationFeeActive());
  }

  @Test
  void updateRejectsInvalidFeesAndGuests() {
    assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.update(
        new GraduationSettingsRequest(BigDecimal.ZERO, 2, BigDecimal.ONE, BigDecimal.ONE)))
        .getStatusCode().value());
    assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.update(
        new GraduationSettingsRequest(BigDecimal.TEN, -1, BigDecimal.ONE, BigDecimal.ONE)))
        .getStatusCode().value());
    verify(repository, never()).save(any(GraduationSettings.class));
  }

  @Test
  void feeCanBeEditedDeactivatedAndDeleted() {
    service.updateFee("extra_guest", new GraduationFeeRequest(new BigDecimal("250.00")));
    assertEquals(new BigDecimal("250.00"), current.getExtraGuestFee());

    service.setFeeActive("EXTRA_GUEST", new GraduationFeeActivationRequest(false));
    assertFalse(current.isExtraGuestFeeActive());

    service.deleteFee("EXTRA_GUEST");
    assertEquals(BigDecimal.ZERO, current.getExtraGuestFee());
    assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.setFeeActive(
        "EXTRA_GUEST", new GraduationFeeActivationRequest(true))).getStatusCode().value());
  }

  @Test
  void unknownFeeKeyIsRejected() {
    assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.deleteFee("TOGA"))
        .getStatusCode().value());
  }

  @Test
  void periodNeedsBothDatesAndEndAfterStart() {
    LocalDateTime start = LocalDateTime.of(2026, 11, 1, 8, 0);

    assertEquals(400, assertThrows(ResponseStatusException.class,
        () -> service.updatePeriod(new GraduationPeriodRequest(start, null)))
        .getStatusCode().value());
    assertEquals(400, assertThrows(ResponseStatusException.class,
        () -> service.updatePeriod(new GraduationPeriodRequest(start, start.minusDays(1))))
        .getStatusCode().value());

    GraduationSettingsResponse response = service.updatePeriod(
        new GraduationPeriodRequest(start, start.plusDays(20)));
    assertEquals(start, response.periodStart());
  }

  @Test
  void ceremonyDayRequiresDateAndOrderedTimes() {
    LocalDate day = LocalDate.of(2026, 12, 12);

    assertEquals(400, assertThrows(ResponseStatusException.class,
        () -> service.updateDay(new GraduationDayRequest(day, LocalTime.of(10, 0), null)))
        .getStatusCode().value());
    assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.updateDay(
        new GraduationDayRequest(day, LocalTime.of(12, 0), LocalTime.of(10, 0))))
        .getStatusCode().value());

    GraduationSettingsResponse response = service.updateDay(
        new GraduationDayRequest(day, LocalTime.of(9, 0), LocalTime.of(13, 0)));
    assertEquals(day, response.ceremonyDate());
    assertEquals(LocalTime.of(13, 0), response.ceremonyEndTime());
  }

  @Test
  void quoteAddsRequirementsAndChargesOnlyGuestsBeyondTheIncludedOnes() {
    configure("2500.00", 2, "300.00");
    when(requirements.findAllByOrderByIdAsc()).thenReturn(
        List.of(requirement("Toga", "500.00"), requirement("Fotografia", "150.00")));

    GraduationQuote within = service.quote(2);
    GraduationQuote beyond = service.quote(5);

    assertEquals(new BigDecimal("3150.00"), within.total());
    assertEquals(0, within.extraGuests());
    assertEquals(3, beyond.extraGuests());
    assertEquals(new BigDecimal("900.00"), beyond.extraGuestsAmount());
    assertEquals(new BigDecimal("4050.00"), beyond.total());
  }

  @Test
  void quoteRequiresGraduationFeeAndExtraGuestFeeWhenNeeded() {
    assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.quote(0))
        .getStatusCode().value());

    configure("2500.00", 2, "0");
    assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.quote(3))
        .getStatusCode().value());
    assertEquals(new BigDecimal("2500.00"), service.quote(2).total());
  }
}
