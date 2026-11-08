package mz.cacoin.graduations;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GraduateRepository extends JpaRepository<Graduate, Long> {
  @EntityGraph(attributePaths = {
      "student", "course", "course.category", "course.level", "course.modality", "registration"
  })
  List<Graduate> findAllByOrderByGraduationDateDescIdDesc();

  Optional<Graduate> findByStudentId(Long studentId);

  boolean existsByCourseId(Long courseId);

  boolean existsByStudentId(Long studentId);
}
