package mz.cacoin.suspensions;

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
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class SuspensionSettingsServiceTest {
  private SuspensionSettingsRepository repository;
  private SuspensionSettingsService service;
  private SuspensionSettings current;

  @BeforeEach
  void setUp() {
    repository = mock(SuspensionSettingsRepository.class);
    service = new SuspensionSettingsService(repository);
    current = new SuspensionSettings();
    when(repository.findById(1L)).thenReturn(Optional.of(current));
    when(repository.save(any(SuspensionSettings.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
  }

  @Test
  void updatingFeeStoresAmountAndActivatesIt() {
    current.setFeeActive(false);

    SuspensionSettingsResponse response =
        service.updateFee(new SuspensionFeeRequest(new BigDecimal("400.00")));

    assertEquals(new BigDecimal("400.00"), response.fee());
    assertTrue(response.feeActive());
    assertEquals(new BigDecimal("400.00"), service.activeFee());
  }

  @Test
  void deletingFeeClearsItAndDisablesNewSuspensions() {
    current.setFee(new BigDecimal("400.00"));

    SuspensionSettingsResponse response = service.deleteFee();

    assertEquals(BigDecimal.ZERO, response.fee());
    assertFalse(response.feeActive());
    assertEquals(BigDecimal.ZERO, service.activeFee());
  }

  @Test
  void feeMustBePositiveWithTwoDecimals() {
    assertEquals(400, assertThrows(ResponseStatusException.class,
        () -> service.updateFee(new SuspensionFeeRequest(BigDecimal.ZERO)))
        .getStatusCode().value());
    assertEquals(400, assertThrows(ResponseStatusException.class,
        () -> service.updateFee(new SuspensionFeeRequest(new BigDecimal("1.234"))))
        .getStatusCode().value());
    verify(repository, never()).save(any(SuspensionSettings.class));
  }

  @Test
  void activationRequiresPositiveFee() {
    assertEquals(400, assertThrows(ResponseStatusException.class,
        () -> service.setFeeActive(new SuspensionFeeActivationRequest(true)))
        .getStatusCode().value());
  }
}
