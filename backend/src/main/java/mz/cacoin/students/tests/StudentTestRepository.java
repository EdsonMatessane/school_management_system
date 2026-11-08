package mz.cacoin.students.tests;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface StudentTestRepository extends JpaRepository<StudentTest, Long> {
  @Query("""
      select t
      from StudentTest t
      join fetch t.course c
      join fetch c.category
      join fetch c.level
      join fetch c.modality
      left join fetch t.module
      left join fetch t.discipline
      order by t.id asc
      """)
  List<StudentTest> findAllDetailed();

  boolean existsByCourseId(Long courseId);

  boolean existsByModuleId(Long moduleId);

  boolean existsByDisciplineId(Long disciplineId);

  boolean existsByModuleIdAndNameIgnoreCase(Long moduleId, String name);

  boolean existsByModuleIdAndNameIgnoreCaseAndIdNot(Long moduleId, String name, Long id);

  boolean existsByDisciplineIdAndNameIgnoreCase(Long disciplineId, String name);

  boolean existsByDisciplineIdAndNameIgnoreCaseAndIdNot(
      Long disciplineId, String name, Long id);
}
