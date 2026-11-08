package mz.cacoin.courses.manualfees;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ManualFeeRepository extends JpaRepository<ManualFee, Long> {
  List<ManualFee> findAllByOrderByIdAsc();

  boolean existsByTypeIgnoreCase(String type);

  boolean existsByTypeIgnoreCaseAndIdNot(String type, Long id);
}
