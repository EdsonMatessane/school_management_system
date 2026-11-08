package mz.cacoin.requests;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StudentRequestRepository extends JpaRepository<StudentRequest, Long> {
  @Query(
      value = "SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext('student_request_number'))) lock_row",
      nativeQuery = true)
  Integer lockRequestNumbering();

  @Query("select coalesce(max(r.requestNumber), 0) + 1 from StudentRequest r")
  Integer nextRequestNumber();

  @EntityGraph(attributePaths = {
      "student", "course", "course.category", "course.level", "course.modality", "type"
  })
  List<StudentRequest> findAllByOrderByCreatedAtDescIdDesc();

  boolean existsByTypeId(Long typeId);

  boolean existsByStudentId(Long studentId);

  boolean existsByCourseId(Long courseId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select r from StudentRequest r where r.id = :id")
  Optional<StudentRequest> findByIdForUpdate(@Param("id") Long id);
}
