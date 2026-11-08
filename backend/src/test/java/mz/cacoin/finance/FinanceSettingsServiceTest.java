package mz.cacoin.finance;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Optional;
import mz.cacoin.settings.SystemSettingsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class FinanceSettingsServiceTest {
  private FinanceSettingsRepository repository;
  private FinanceSettingsService service;

  @BeforeEach
  void setUp() {
    repository = mock(FinanceSettingsRepository.class);
    service = new FinanceSettingsService(repository, mock(SystemSettingsRepository.class));
    when(repository.findById(1L)).thenReturn(Optional.of(new FinanceSettings()));
    when(repository.save(any(FinanceSettings.class))).thenAnswer(invocation -> invocation.getArgument(0));
  }

  @Test
  void periodNeedsBothDatesAndEndAfterStart() {
    LocalDateTime start = LocalDateTime.of(2026, 11, 25, 8, 0);

    assertEquals(400, assertThrows(ResponseStatusException.class,
        () -> service.updatePeriod(new FinancePeriodRequest(start, null))).getStatusCode().value());
    assertEquals(400, assertThrows(ResponseStatusException.class,
        () -> service.updatePeriod(new FinancePeriodRequest(start, start.minusDays(1))))
        .getStatusCode().value());
    verify(repository, never()).save(any(FinanceSettings.class));
    assertEquals(start, service.updatePeriod(
        new FinancePeriodRequest(start, start.plusDays(5))).processingPeriodStart());
  }

  @Test
  void rulesAcceptPartialOrFullAndALimitedAdvance() {
    FinanceSettingsResponse response =
        service.updateRules(new FinanceRulesRequest("partial", 3));

    assertEquals("PARTIAL", response.paymentRule());
    assertEquals(3, response.maxAdvanceMonths());
    assertEquals("PARTIAL", service.paymentRule());
    assertEquals(3, service.maxAdvanceMonths());
  }

  @Test
  void rulesRejectUnknownRulesAndOutOfRangeAdvances() {
    assertEquals(400, assertThrows(ResponseStatusException.class,
        () -> service.updateRules(new FinanceRulesRequest("OUTRA", 1))).getStatusCode().value());
    assertEquals(400, assertThrows(ResponseStatusException.class,
        () -> service.updateRules(new FinanceRulesRequest("FULL", 13))).getStatusCode().value());
    assertEquals(400, assertThrows(ResponseStatusException.class,
        () -> service.updateRules(new FinanceRulesRequest("FULL", -1))).getStatusCode().value());
  }
}
