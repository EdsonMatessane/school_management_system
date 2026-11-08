package mz.cacoin.modules.disciplines;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface DisciplineRepository extends JpaRepository<Discipline, Long> {
  @Query("""
      select d.id as id,
             c.id as courseId,
             c.name as courseName,
             d.disciplineNumber as disciplineNumber,
             d.name as name,
             d.active as active
      from Discipline d
      join d.course c
      order by c.id, d.disciplineNumber, d.id
      """)
  List<DisciplineSummaryProjection> findAllSummaries();

  boolean existsByCourseId(Long courseId);

  boolean existsByCourseIdAndNameIgnoreCase(Long courseId, String name);

  boolean existsByCourseIdAndNameIgnoreCaseAndIdNot(Long courseId, String name, Long id);

  List<Discipline> findAllByCourseIdOrderByDisciplineNumberAsc(Long courseId);
}
