package mz.cacoin.statuses;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Cria os estados iniciais em falta sem alterar os que já foram editados. */
@Component
@Order(0)
@RequiredArgsConstructor
public class SystemStatusInitializer implements ApplicationRunner {
  private final SystemStatusRepository statuses;

  @Override
  @Transactional
  public void run(ApplicationArguments arguments) {
    StatusModules.DEFAULTS.forEach((module, seeds) -> {
      int order = 1;
      for (StatusModules.Seed seed : seeds) {
        if (!statuses.existsByModuleAndCode(module, seed.code())) {
          SystemStatus status = new SystemStatus();
          status.setModule(module);
          status.setCode(seed.code());
          status.setLabel(seed.label());
          status.setTone(seed.tone());
          status.setSortOrder(order);
          status.setSystemDefined(true);
          statuses.save(status);
        }
        order++;
      }
    });
  }
}
