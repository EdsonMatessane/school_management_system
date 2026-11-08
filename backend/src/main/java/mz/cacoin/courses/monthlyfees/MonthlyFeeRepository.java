package mz.cacoin.courses.monthlyfees;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MonthlyFeeRepository extends JpaRepository<MonthlyFee, Long> {
  List<MonthlyFee> findAllByOrderByIdAsc();

  boolean existsByTypeIgnoreCase(String type);

  boolean existsByTypeIgnoreCaseAndIdNot(String type, Long id);
}
