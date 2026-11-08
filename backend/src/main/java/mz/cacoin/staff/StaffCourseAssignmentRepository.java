package mz.cacoin.staff;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StaffCourseAssignmentRepository
    extends JpaRepository<StaffCourseAssignment, Long> {
  List<StaffCourseAssignment> findAllByStaffMemberIdOrderByIdAsc(Long staffId);

  Optional<StaffCourseAssignment> findByIdAndStaffMemberId(Long id, Long staffId);

  boolean existsByStaffMemberIdAndCourseId(Long staffId, Long courseId);

  boolean existsByCourseId(Long courseId);

  List<StaffCourseAssignment> findAllByCourseIdAndActiveTrue(Long courseId);
}
