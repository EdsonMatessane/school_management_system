package mz.cacoin.tests;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

public interface TestRegistrationRepository extends JpaRepository<TestRegistration, Long> {
  @EntityGraph(attributePaths = {
      "student", "course", "course.category", "course.level", "course.modality"
  })
  List<TestRegistration> findAllByOrderByCreatedAtDescIdDesc();

  boolean existsByCourseId(Long courseId);

  boolean existsByStudentId(Long studentId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select registration from TestRegistration registration where registration.id = :id")
  Optional<TestRegistration> findByIdForUpdate(@Param("id") Long id);
}
