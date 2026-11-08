package mz.cacoin.mobilemoney;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class MobileMoneySweeper {
  private final MobileMoneyService service;

  @Scheduled(initialDelay = 30_000, fixedDelay = 30_000)
  public void sweep() {
    for (Long id : service.pendingIds()) {
      try {
        service.refresh(id);
      } catch (RuntimeException exception) {
        log.warn("Não foi possível actualizar a transacção Mobile Money {}", id, exception);
      }
    }
  }
}
