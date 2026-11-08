package mz.cacoin.modules;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ModuleRepository extends JpaRepository<Module, Long> {
  @Query("""
      select m.id as id,
             c.id as courseId,
             c.name as courseName,
             m.moduleNumber as moduleNumber,
             m.name as name,
             m.active as active
      from Module m
      join m.course c
      order by c.id, m.moduleNumber, m.id
      """)
  List<ModuleSummaryProjection> findAllSummaries();

  boolean existsByCourseId(Long courseId);

  List<Module> findAllByCourseIdAndActiveTrueOrderByModuleNumberAsc(Long courseId);

}
