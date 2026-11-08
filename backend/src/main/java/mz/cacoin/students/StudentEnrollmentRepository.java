package mz.cacoin.students;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface StudentEnrollmentRepository extends JpaRepository<StudentEnrollment, Long> {
  java.util.List<StudentEnrollment> findAllByOrderByCreatedAtDescIdDesc();

  Optional<StudentEnrollment> findFirstByStudentIdOrderByCreatedAtDescIdDesc(Long studentId);

  void deleteAllByStudentId(Long studentId);

  boolean existsByCourseId(Long courseId);
}
