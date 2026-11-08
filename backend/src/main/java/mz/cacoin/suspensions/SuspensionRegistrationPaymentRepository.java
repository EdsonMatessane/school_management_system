package mz.cacoin.suspensions;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SuspensionRegistrationPaymentRepository
    extends JpaRepository<SuspensionRegistrationPayment, Long> {
  boolean existsByMethodIgnoreCase(String method);

  List<SuspensionRegistrationPayment> findAllByRegistrationIdIn(Collection<Long> registrationIds);

  List<SuspensionRegistrationPayment> findAllByRegistrationId(Long registrationId);

  @Modifying
  @Query("""
      update SuspensionRegistrationPayment payment
      set payment.method = :name
      where lower(payment.method) = lower(:previousName)
      """)
  int renameMethod(@Param("previousName") String previousName, @Param("name") String name);
}
