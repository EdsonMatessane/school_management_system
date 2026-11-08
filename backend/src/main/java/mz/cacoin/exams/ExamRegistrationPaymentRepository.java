package mz.cacoin.exams;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExamRegistrationPaymentRepository
    extends JpaRepository<ExamRegistrationPayment, Long> {
  boolean existsByMethodIgnoreCase(String method);

  List<ExamRegistrationPayment> findAllByRegistrationIdInOrderByPaymentDateAscIdAsc(
      Collection<Long> registrationIds);

  List<ExamRegistrationPayment> findAllByRegistrationIdOrderByPaymentDateAscIdAsc(
      Long registrationId);

  @Modifying
  @Query("""
      update ExamRegistrationPayment payment
      set payment.method = :name
      where lower(payment.method) = lower(:previousName)
      """)
  int renameMethod(@Param("previousName") String previousName, @Param("name") String name);
}
