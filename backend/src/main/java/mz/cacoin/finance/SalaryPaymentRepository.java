package mz.cacoin.finance;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalaryPaymentRepository extends JpaRepository<SalaryPayment, Long> {
  @EntityGraph(attributePaths = {"staff"})
  List<SalaryPayment> findAllByOrderByReferenceMonthDescIdDesc();

  @EntityGraph(attributePaths = {"staff"})
  List<SalaryPayment> findAllByStaffIdOrderByReferenceMonthAsc(Long staffId);

  Optional<SalaryPayment> findByStaffIdAndReferenceMonth(Long staffId, LocalDate referenceMonth);

  boolean existsByStaffId(Long staffId);
}
