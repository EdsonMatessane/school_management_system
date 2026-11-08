package mz.cacoin.graduations;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GraduationRegistrationRepository
    extends JpaRepository<GraduationRegistration, Long> {
  @EntityGraph(attributePaths = {
      "student", "course", "course.category", "course.level", "course.modality"
  })
  List<GraduationRegistration> findAllByOrderByCreatedAtDescIdDesc();

  boolean existsByCourseId(Long courseId);

  boolean existsByStudentId(Long studentId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select r from GraduationRegistration r where r.id = :id")
  Optional<GraduationRegistration> findByIdForUpdate(@Param("id") Long id);
}
