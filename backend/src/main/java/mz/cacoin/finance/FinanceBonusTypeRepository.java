package mz.cacoin.finance;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FinanceBonusTypeRepository extends JpaRepository<FinanceBonusType, Long> {
  List<FinanceBonusType> findAllByOrderByIdAsc();

  boolean existsByNameIgnoreCase(String name);

  boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}
