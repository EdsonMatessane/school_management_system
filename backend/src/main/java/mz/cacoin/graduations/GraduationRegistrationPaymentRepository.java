package mz.cacoin.graduations;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GraduationRegistrationPaymentRepository
    extends JpaRepository<GraduationRegistrationPayment, Long> {
  boolean existsByMethodIgnoreCase(String method);

  List<GraduationRegistrationPayment> findAllByRegistrationIdIn(Collection<Long> registrationIds);

  List<GraduationRegistrationPayment> findAllByRegistrationId(Long registrationId);

  @Modifying
  @Query("""
      update GraduationRegistrationPayment payment
      set payment.method = :name
      where lower(payment.method) = lower(:previousName)
      """)
  int renameMethod(@Param("previousName") String previousName, @Param("name") String name);
}
