package mz.cacoin.uniforms;

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

class UniformSettingsServiceTest {
  private UniformSettingsRepository repository;
  private UniformSettingsService service;
  private UniformSettings current;

  @BeforeEach
  void setUp() {
    repository = mock(UniformSettingsRepository.class);
    service = new UniformSettingsService(repository);
    current = new UniformSettings();
    when(repository.findById(1L)).thenReturn(Optional.of(current));
    when(repository.save(any(UniformSettings.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
  }

  @Test
  void updatingFeeStoresAmountAndActivatesIt() {
    current.setFeeActive(false);

    UniformSettingsResponse response =
        service.updateFee(new UniformFeeRequest(new BigDecimal("750.00")));

    assertEquals(new BigDecimal("750.00"), response.fee());
    assertTrue(response.feeActive());
    assertEquals(new BigDecimal("750.00"), service.activeFee());
  }

  @Test
  void deletingFeeClearsItAndDisablesNewOrders() {
    current.setFee(new BigDecimal("750.00"));

    UniformSettingsResponse response = service.deleteFee();

    assertEquals(BigDecimal.ZERO, response.fee());
    assertFalse(response.feeActive());
    assertEquals(BigDecimal.ZERO, service.activeFee());
  }

  @Test
  void inactiveFeeIsNotExposedAsActiveFee() {
    current.setFee(new BigDecimal("500.00"));
    current.setFeeActive(false);

    assertEquals(BigDecimal.ZERO, service.activeFee());
  }

  @Test
  void feeMustBePositiveWithTwoDecimals() {
    assertEquals(400, assertThrows(ResponseStatusException.class,
        () -> service.updateFee(new UniformFeeRequest(BigDecimal.ZERO))).getStatusCode().value());
    assertEquals(400, assertThrows(ResponseStatusException.class,
        () -> service.updateFee(new UniformFeeRequest(new BigDecimal("10.555")))).getStatusCode().value());
    verify(repository, never()).save(any(UniformSettings.class));
  }

  @Test
  void activationRequiresPositiveFee() {
    ResponseStatusException exception = assertThrows(
        ResponseStatusException.class,
        () -> service.setFeeActive(new UniformFeeActivationRequest(true)));

    assertEquals(400, exception.getStatusCode().value());
    verify(repository, never()).save(any(UniformSettings.class));
  }
}
