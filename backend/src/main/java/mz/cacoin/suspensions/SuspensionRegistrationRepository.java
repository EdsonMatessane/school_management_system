package mz.cacoin.suspensions;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SuspensionRegistrationRepository
    extends JpaRepository<SuspensionRegistration, Long> {
  @EntityGraph(attributePaths = {
      "student", "course", "course.category", "course.level", "course.modality"
  })
  List<SuspensionRegistration> findAllByOrderByCreatedAtDescIdDesc();

  boolean existsByCourseId(Long courseId);

  boolean existsByStudentId(Long studentId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select r from SuspensionRegistration r where r.id = :id")
  Optional<SuspensionRegistration> findByIdForUpdate(@Param("id") Long id);
}
