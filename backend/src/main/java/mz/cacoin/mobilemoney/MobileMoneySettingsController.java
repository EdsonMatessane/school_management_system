package mz.cacoin.mobilemoney;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class MobileMoneySettingsController {
  private final MobileMoneySettingsService settings;

  @GetMapping("/api/settings/mobile-money")
  public List<MobileMoneyDtos.WalletResponse> list() {
    return settings.list();
  }

  @PutMapping("/api/settings/mobile-money")
  public List<MobileMoneyDtos.WalletResponse> update(
      @RequestBody List<MobileMoneyDtos.WalletRequest> request) {
    return settings.update(request);
  }

  @GetMapping("/api/settings/mobile-money/banks")
  public List<MobileMoneyDtos.BankResponse> banks() {
    return settings.listBanks();
  }

  @PostMapping("/api/settings/mobile-money/banks")
  @ResponseStatus(HttpStatus.CREATED)
  public MobileMoneyDtos.BankResponse createBank(@RequestBody MobileMoneyDtos.BankRequest request) {
    return settings.createBank(request);
  }

  @PutMapping("/api/settings/mobile-money/banks/{id}")
  public MobileMoneyDtos.BankResponse updateBank(
      @PathVariable Long id, @RequestBody MobileMoneyDtos.BankRequest request) {
    return settings.updateBank(id, request);
  }

  @DeleteMapping("/api/settings/mobile-money/banks/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteBank(@PathVariable Long id) {
    settings.deleteBank(id);
  }

  @GetMapping("/api/mobile-money/banks")
  public List<MobileMoneyDtos.BankResponse> activeBanks() {
    return settings.listBanks();
  }

  @GetMapping("/api/mobile-money/wallets")
  public List<MobileMoneyDtos.WalletResponse> active() {
    return settings.active();
  }
}
