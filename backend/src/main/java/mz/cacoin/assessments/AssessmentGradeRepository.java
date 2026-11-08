package mz.cacoin.assessments;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssessmentGradeRepository extends JpaRepository<AssessmentGrade, Long> {
  List<AssessmentGrade> findAllBySheetIdIn(Collection<Long> sheetIds);

  @EntityGraph(attributePaths = {"student"})
  List<AssessmentGrade> findAllBySheetIdAndComponent(Long sheetId, String component);

  List<AssessmentGrade> findAllBySheetId(Long sheetId);

  List<AssessmentGrade> findAllBySheetAcademicYearAndStudentId(int academicYear, Long studentId);

  @EntityGraph(attributePaths = {"sheet", "sheet.course"})
  List<AssessmentGrade> findAllByStudentIdOrderBySheetAcademicYearDescIdAsc(Long studentId);

  boolean existsByStudentId(Long studentId);
}
