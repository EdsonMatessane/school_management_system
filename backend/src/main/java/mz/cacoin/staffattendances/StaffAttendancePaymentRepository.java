package mz.cacoin.staffattendances;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StaffAttendancePaymentRepository
    extends JpaRepository<StaffAttendancePayment, Long> {
  List<StaffAttendancePayment> findAllByRecordIdIn(Collection<Long> recordIds);
}
