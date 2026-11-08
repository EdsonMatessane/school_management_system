package mz.cacoin.students;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StudentFeeChargeRepository extends JpaRepository<StudentFeeCharge, Long> {
  List<StudentFeeCharge> findAllByOrderByCreatedAtDescIdDesc();

  boolean existsByEnrollmentIdAndFeeTypeAndPeriodLabel(
      Long enrollmentId, String feeType, String periodLabel);

  boolean existsByEnrollmentIdAndFeeType(Long enrollmentId, String feeType);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select charge from StudentFeeCharge charge where charge.id = :id")
  Optional<StudentFeeCharge> findByIdForUpdate(@Param("id") Long id);
}
