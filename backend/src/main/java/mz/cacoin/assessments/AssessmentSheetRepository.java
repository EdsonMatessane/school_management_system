package mz.cacoin.assessments;

import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssessmentSheetRepository extends JpaRepository<AssessmentSheet, Long> {
  @EntityGraph(attributePaths = {"course", "course.category", "course.level", "course.modality"})
  List<AssessmentSheet> findAllByOrderByAcademicYearDescIdDesc();

  @EntityGraph(attributePaths = {"course", "course.category", "course.level", "course.modality"})
  List<AssessmentSheet> findAllByCourseIdAndAcademicYearOrderByIdAsc(Long courseId, int academicYear);

  boolean existsByCourseId(Long courseId);
}
