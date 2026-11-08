package mz.cacoin.attendances;

import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {
  @EntityGraph(attributePaths = {
      "student", "course", "course.category", "course.level", "course.modality", "teacher"
  })
  List<AttendanceRecord> findAllByOrderByAttendanceDateDescIdDesc();

  @EntityGraph(attributePaths = {
      "student", "course", "course.category", "course.level", "course.modality", "teacher"
  })
  @Query("""
      select r from AttendanceRecord r
      where r.status = 'ABSENT' and r.justificationPaid = false
      order by r.attendanceDate desc, r.id desc
      """)
  List<AttendanceRecord> findUnjustifiedAbsences();

  @Query("""
      select count(r) from AttendanceRecord r
      where r.student.id = :studentId and r.status = 'ABSENT' and r.justificationPaid = false
      """)
  long countUnjustifiedAbsences(@Param("studentId") Long studentId);

  boolean existsByStudentIdAndAttendanceDate(Long studentId, LocalDate attendanceDate);

  boolean existsByCourseId(Long courseId);

  boolean existsByStudentId(Long studentId);

  boolean existsByTeacherId(Long teacherId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select r from AttendanceRecord r where r.id = :id")
  Optional<AttendanceRecord> findByIdForUpdate(@Param("id") Long id);
}
