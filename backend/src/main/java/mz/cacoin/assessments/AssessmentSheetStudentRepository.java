package mz.cacoin.assessments;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssessmentSheetStudentRepository extends JpaRepository<AssessmentSheetStudent, Long> {
  List<AssessmentSheetStudent> findAllBySheetIdIn(Collection<Long> sheetIds);

  Optional<AssessmentSheetStudent> findBySheetIdAndStudentId(Long sheetId, Long studentId);
}
