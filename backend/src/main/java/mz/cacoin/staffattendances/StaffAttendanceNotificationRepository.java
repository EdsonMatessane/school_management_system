package mz.cacoin.staffattendances;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StaffAttendanceNotificationRepository
    extends JpaRepository<StaffAttendanceNotification, Long> {
  List<StaffAttendanceNotification> findAllByStaffIdInOrderByIdDesc(Collection<Long> staffIds);
}
