package mz.cacoin.staffattendances;

import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StaffAttendanceRecordRepository
    extends JpaRepository<StaffAttendanceRecord, Long> {
  @EntityGraph(attributePaths = {"staff"})
  @Query("""
      select r from StaffAttendanceRecord r
      where r.staff.staffType = :staffType
      order by r.attendanceDate desc, r.id desc
      """)
  List<StaffAttendanceRecord> findAllByType(@Param("staffType") String staffType);

  @EntityGraph(attributePaths = {"staff"})
  @Query("""
      select r from StaffAttendanceRecord r
      where r.staff.staffType = :staffType and r.status = 'ABSENT' and r.justificationPaid = false
      order by r.attendanceDate desc, r.id desc
      """)
  List<StaffAttendanceRecord> findUnjustifiedAbsences(@Param("staffType") String staffType);

  @Query("""
      select count(r) from StaffAttendanceRecord r
      where r.staff.id = :staffId and r.status = 'ABSENT' and r.justificationPaid = false
      """)
  long countUnjustifiedAbsences(@Param("staffId") Long staffId);

  boolean existsByStaffIdAndAttendanceDate(Long staffId, LocalDate attendanceDate);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select r from StaffAttendanceRecord r where r.id = :id")
  Optional<StaffAttendanceRecord> findByIdForUpdate(@Param("id") Long id);

  @Query("""
      select a from StaffCourseAssignment a
      join fetch a.course c join fetch c.category join fetch c.level join fetch c.modality
      where a.staffMember.id in :staffIds and a.active = true order by a.id asc
      """)
  List<mz.cacoin.staff.StaffCourseAssignment> findActiveAssignments(
      @Param("staffIds") Collection<Long> staffIds);

  @Query("select p.id, p.name from FinancePosition p where p.id in :ids")
  List<Object[]> findPositionNames(@Param("ids") Collection<Long> ids);
}
