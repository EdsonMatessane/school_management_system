package mz.cacoin.students;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StudentFeePaymentRepository extends JpaRepository<StudentFeePayment, Long> {
  List<StudentFeePayment> findAllByChargeIdOrderByPaymentDateDescIdDesc(Long chargeId);

  boolean existsByMethodIgnoreCase(String method);

  @Modifying
  @Query("update StudentFeePayment payment set payment.method = :newName "
      + "where lower(payment.method) = lower(:oldName)")
  int renameMethod(@Param("oldName") String oldName, @Param("newName") String newName);

  @Query("select coalesce(sum(payment.amount), 0) from StudentFeePayment payment "
      + "where payment.charge.id = :chargeId")
  BigDecimal sumAmountByChargeId(@Param("chargeId") Long chargeId);
}
