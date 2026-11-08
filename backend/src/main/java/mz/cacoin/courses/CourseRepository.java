package mz.cacoin.courses;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CourseRepository extends JpaRepository<Course, Long> {
  List<Course> findAllByOrderByIdAsc();

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select c from Course c where c.id = :id")
  Optional<Course> findByIdForUpdate(@Param("id") Long id);

  boolean existsByNameIgnoreCase(String name);

  boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

  boolean existsByNameIgnoreCaseAndModalityId(String name, Long modalityId);

  boolean existsByNameIgnoreCaseAndModalityIdAndIdNot(String name, Long modalityId, Long id);

  boolean existsByCategoryId(Long categoryId);

  boolean existsByLevelId(Long levelId);

  boolean existsByModalityId(Long modalityId);

  boolean existsByMonthlyFeeId(Long monthlyFeeId);

  boolean existsByEnrollmentFeeId(Long enrollmentFeeId);

  boolean existsByManualFeeId(Long manualFeeId);
}
