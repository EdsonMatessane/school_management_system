package mz.cacoin.uniforms;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UniformOrderRepository extends JpaRepository<UniformOrder, Long> {
  @EntityGraph(attributePaths = {
      "student", "course", "course.category", "course.level", "course.modality"
  })
  List<UniformOrder> findAllByOrderByCreatedAtDescIdDesc();

  boolean existsByCourseId(Long courseId);

  boolean existsByStudentId(Long studentId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select o from UniformOrder o where o.id = :id")
  Optional<UniformOrder> findByIdForUpdate(@Param("id") Long id);
}
