package mz.cacoin.attendances;

import java.util.List;
import mz.cacoin.staff.StaffCourseAssignment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AttendanceTeacherAssignmentRepository
    extends JpaRepository<StaffCourseAssignment, Long> {
  @EntityGraph(attributePaths = {"staffMember"})
  List<StaffCourseAssignment> findAllByCourseIdAndActiveTrue(Long courseId);

  boolean existsByStaffMemberIdAndCourseIdAndActiveTrue(Long staffId, Long courseId);
}
