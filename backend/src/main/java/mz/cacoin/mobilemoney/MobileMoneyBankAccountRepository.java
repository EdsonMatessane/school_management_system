package mz.cacoin.mobilemoney;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MobileMoneyBankAccountRepository
    extends JpaRepository<MobileMoneyBankAccount, Long> {
  List<MobileMoneyBankAccount> findAllByOrderByIdAsc();

  boolean existsByNib(String nib);

  boolean existsByNibAndIdNot(String nib, Long id);
}
