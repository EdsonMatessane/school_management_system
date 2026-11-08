package mz.cacoin.finance;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FinanceSalaryTypeRepository extends JpaRepository<FinanceSalaryType, Long> {
  List<FinanceSalaryType> findAllByOrderByIdAsc();

  boolean existsByNameIgnoreCase(String name);

  boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}
