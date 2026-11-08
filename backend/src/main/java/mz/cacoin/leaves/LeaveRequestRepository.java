package mz.cacoin.leaves;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import mz.cacoin.staff.StaffCourseAssignment;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {
  @EntityGraph(attributePaths = {"staffMember"})
  List<LeaveRequest> findAllByOrderByRequestDateDescIdDesc();

  @Query("select count(r) from LeaveRequest r where r.staffMember.id = :staffId "
      + "and r.requestDate between :from and :to and r.status <> :excludedStatus")
  long countInPeriod(
      @Param("staffId") Long staffId,
      @Param("from") LocalDate from,
      @Param("to") LocalDate to,
      @Param("excludedStatus") String excludedStatus);

  @Query("select a from StaffCourseAssignment a "
      + "join fetch a.course c join fetch c.category join fetch c.level join fetch c.modality "
      + "where a.staffMember.id in :staffIds and a.active = true order by a.id asc")
  List<StaffCourseAssignment> findActiveAssignments(
      @Param("staffIds") Collection<Long> staffIds);

  @Query("select p.id, p.name from FinancePosition p where p.id in :ids")
  List<Object[]> findPositionNames(@Param("ids") Collection<Long> ids);
}
