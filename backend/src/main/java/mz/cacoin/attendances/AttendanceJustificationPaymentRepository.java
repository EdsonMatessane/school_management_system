package mz.cacoin.attendances;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AttendanceJustificationPaymentRepository
    extends JpaRepository<AttendanceJustificationPayment, Long> {
  boolean existsByMethodIgnoreCase(String method);

  List<AttendanceJustificationPayment> findAllByRecordIdIn(Collection<Long> recordIds);

  List<AttendanceJustificationPayment> findAllByRecordId(Long recordId);

  @Modifying
  @Query("""
      update AttendanceJustificationPayment payment
      set payment.method = :name
      where lower(payment.method) = lower(:previousName)
      """)
  int renameMethod(@Param("previousName") String previousName, @Param("name") String name);
}
