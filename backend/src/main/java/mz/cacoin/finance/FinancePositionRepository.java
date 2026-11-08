package mz.cacoin.finance;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FinancePositionRepository extends JpaRepository<FinancePosition, Long> {
  List<FinancePosition> findAllByOrderByIdAsc();

  boolean existsByNameIgnoreCase(String name);

  boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

  @Query("select count(s) > 0 from StaffMember s where s.positionId = :positionId")
  boolean isUsedByStaff(@Param("positionId") Long positionId);
}
