package mz.cacoin.finance;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalaryRegistrationRepository extends JpaRepository<SalaryRegistration, Long> {
  @EntityGraph(attributePaths = {"staff", "position", "salaryType", "bonusType"})
  List<SalaryRegistration> findAllByOrderByIdAsc();

  @EntityGraph(attributePaths = {"staff", "position", "salaryType", "bonusType"})
  Optional<SalaryRegistration> findByStaffId(Long staffId);

  boolean existsByStaffId(Long staffId);

  boolean existsByPositionId(Long positionId);

  boolean existsBySalaryTypeId(Long salaryTypeId);

  boolean existsByBonusTypeId(Long bonusTypeId);
}
