package mz.cacoin.finance;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/finance/settings")
@RequiredArgsConstructor
public class FinanceSettingsController {
  private final FinanceSettingsService settings;

  @GetMapping
  public FinanceSettingsResponse get() {
    return settings.get();
  }

  @PutMapping("/period")
  public FinanceSettingsResponse updatePeriod(@RequestBody FinancePeriodRequest request) {
    return settings.updatePeriod(request);
  }

  @PutMapping("/rules")
  public FinanceSettingsResponse updateRules(@RequestBody FinanceRulesRequest request) {
    return settings.updateRules(request);
  }
}
