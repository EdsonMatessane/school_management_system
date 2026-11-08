package mz.cacoin.courses.enrollmentfees;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EnrollmentFeeRepository extends JpaRepository<EnrollmentFee, Long> {
  List<EnrollmentFee> findAllByOrderByIdAsc();

  boolean existsByTypeIgnoreCase(String type);

  boolean existsByTypeIgnoreCaseAndIdNot(String type, Long id);
}
