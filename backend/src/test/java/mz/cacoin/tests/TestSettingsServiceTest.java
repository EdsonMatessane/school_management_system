package mz.cacoin.tests;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Optional;
import mz.cacoin.settings.SystemSettingsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class TestSettingsServiceTest {
  private TestSettingsRepository repository;
  private TestSettingsService service;
  private TestSettings current;

  @BeforeEach
  void setUp() {
    repository = org.mockito.Mockito.mock(TestSettingsRepository.class);
    service = new TestSettingsService(
        repository, org.mockito.Mockito.mock(SystemSettingsRepository.class));
    current = new TestSettings();
    when(repository.findById(1L)).thenReturn(Optional.of(current));
    when(repository.save(any(TestSettings.class))).thenAnswer(invocation -> invocation.getArgument(0));
  }

  @Test
  void deletingFeeClearsItAndDisablesNewRegistrations() {
    current.setNormalFee(new BigDecimal("300.00"));

    TestSettingsResponse response = service.deleteFee("NORMAL");

    assertEquals(BigDecimal.ZERO, response.normalFee());
    assertFalse(response.normalFeeActive());
    assertEquals(0, service.feeFor("NORMAL").signum());
  }

  @Test
  void editingFeeSetsAmountAndActivatesIt() {
    current.setNormalFeeActive(false);

    TestSettingsResponse response =
        service.updateFee("NORMAL", new TestFeeRequest(new BigDecimal("250.00")));

    assertEquals(new BigDecimal("250.00"), response.normalFee());
    assertTrue(response.normalFeeActive());
    assertEquals(new BigDecimal("250.00"), service.feeFor("NORMAL"));
  }

  @Test
  void activationRequiresPositiveFee() {
    ResponseStatusException exception = assertThrows(
        ResponseStatusException.class,
        () -> service.setFeeActive("SPECIAL", new TestFeeActivationRequest(true)));

    assertEquals(400, exception.getStatusCode().value());
    verify(repository).findById(1L);
    verify(repository, never()).save(any(TestSettings.class));
  }

  @Test
  void feesAreFreeByDefault() {
    assertEquals(0, service.feeFor("NORMAL").signum());
    assertEquals(0, service.feeFor("SPECIAL").signum());
    assertFalse(service.get().normalFeeActive());
  }

  @Test
  void switchingToNoChargeKeepsAmountButStopsCharging() {
    service.updateFee("NORMAL", new TestFeeRequest(new BigDecimal("250.00"), true));

    TestSettingsResponse response =
        service.updateFee("NORMAL", new TestFeeRequest(null, false));

    assertFalse(response.normalFeeActive());
    assertEquals(0, service.feeFor("NORMAL").signum());
  }

  @Test
  void chargingRequiresPositiveAmount() {
    ResponseStatusException exception = assertThrows(
        ResponseStatusException.class,
        () -> service.updateFee("NORMAL", new TestFeeRequest(BigDecimal.ZERO, true)));

    assertEquals(400, exception.getStatusCode().value());
  }
}
