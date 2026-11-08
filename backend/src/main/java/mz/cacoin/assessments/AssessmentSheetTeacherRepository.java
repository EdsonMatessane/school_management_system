package mz.cacoin.assessments;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssessmentSheetTeacherRepository
    extends JpaRepository<AssessmentSheetTeacher, Long> {
  @EntityGraph(attributePaths = {"teacher"})
  List<AssessmentSheetTeacher> findAllBySheetIdIn(Collection<Long> sheetIds);

  boolean existsByTeacherId(Long teacherId);
}
