package mz.cacoin.attendances;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AttendanceNotificationRepository
    extends JpaRepository<AttendanceNotification, Long> {
  List<AttendanceNotification> findAllByStudentIdInOrderByIdDesc(Collection<Long> studentIds);

  boolean existsByStudentId(Long studentId);
}
