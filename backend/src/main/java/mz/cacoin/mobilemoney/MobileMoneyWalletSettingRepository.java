package mz.cacoin.mobilemoney;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MobileMoneyWalletSettingRepository
    extends JpaRepository<MobileMoneyWalletSetting, Long> {
  Optional<MobileMoneyWalletSetting> findByWallet(String wallet);
}
