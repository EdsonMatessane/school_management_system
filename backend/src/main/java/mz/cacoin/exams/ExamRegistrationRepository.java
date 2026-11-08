package mz.cacoin.exams;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExamRegistrationRepository extends JpaRepository<ExamRegistration, Long> {
  @EntityGraph(attributePaths = {
      "student", "course", "course.category", "course.level", "course.modality"
  })
  List<ExamRegistration> findAllByOrderByCreatedAtDescIdDesc();

  boolean existsByCourseId(Long courseId);

  boolean existsByStudentId(Long studentId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select registration from ExamRegistration registration where registration.id = :id")
  Optional<ExamRegistration> findByIdForUpdate(@Param("id") Long id);
}
