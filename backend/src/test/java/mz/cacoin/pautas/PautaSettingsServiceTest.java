package mz.cacoin.pautas;

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

class PautaSettingsServiceTest {
  private PautaSettingsRepository repository;
  private PautaSettingsService service;

  @BeforeEach
  void setUp() {
    repository = mock(PautaSettingsRepository.class);
    service = new PautaSettingsService(repository, mock(SystemSettingsRepository.class));
    when(repository.findById(1L)).thenReturn(Optional.of(new PautaSettings()));
    when(repository.save(any(PautaSettings.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
  }

  @Test
  void periodNeedsBothDatesAndEndAfterStart() {
    LocalDateTime start = LocalDateTime.of(2026, 12, 1, 8, 0);

    assertEquals(400, assertThrows(ResponseStatusException.class,
        () -> service.updatePeriod(new PautaSettingsRequest(start, null)))
        .getStatusCode().value());
    assertEquals(400, assertThrows(ResponseStatusException.class,
        () -> service.updatePeriod(new PautaSettingsRequest(start, start.minusDays(1))))
        .getStatusCode().value());
    verify(repository, never()).save(any(PautaSettings.class));

    PautaSettingsResponse response =
        service.updatePeriod(new PautaSettingsRequest(start, start.plusDays(10)));
    assertEquals(start, response.launchPeriodStart());
  }
}
