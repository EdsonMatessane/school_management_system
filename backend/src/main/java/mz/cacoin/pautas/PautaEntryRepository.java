package mz.cacoin.pautas;

import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PautaEntryRepository extends JpaRepository<PautaEntry, Long> {
  @EntityGraph(attributePaths = {
      "student", "course", "course.category", "course.level", "course.modality"
  })
  List<PautaEntry> findAllByOrderByAcademicYearDescIdDesc();

  boolean existsByStudentIdAndAcademicYear(Long studentId, int academicYear);

  boolean existsByCourseId(Long courseId);

  boolean existsByStudentId(Long studentId);

  @Query("select distinct e.academicYear from PautaEntry e order by e.academicYear desc")
  List<Integer> findYears();
}
