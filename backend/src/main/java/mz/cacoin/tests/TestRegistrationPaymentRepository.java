package mz.cacoin.tests;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TestRegistrationPaymentRepository
    extends JpaRepository<TestRegistrationPayment, Long> {
  boolean existsByMethodIgnoreCase(String method);

  List<TestRegistrationPayment> findAllByRegistrationIdInOrderByPaymentDateAscIdAsc(
      Collection<Long> registrationIds);

  List<TestRegistrationPayment> findAllByRegistrationIdOrderByPaymentDateAscIdAsc(
      Long registrationId);

  @Modifying
  @Query("""
      update TestRegistrationPayment payment
      set payment.method = :name
      where lower(payment.method) = lower(:previousName)
      """)
  int renameMethod(@Param("previousName") String previousName, @Param("name") String name);
}
