package mz.cacoin.uniforms;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UniformOrderPaymentRepository extends JpaRepository<UniformOrderPayment, Long> {
  boolean existsByMethodIgnoreCase(String method);

  List<UniformOrderPayment> findAllByOrderIdIn(Collection<Long> orderIds);

  List<UniformOrderPayment> findAllByOrderId(Long orderId);

  @Modifying
  @Query("""
      update UniformOrderPayment payment
      set payment.method = :name
      where lower(payment.method) = lower(:previousName)
      """)
  int renameMethod(@Param("previousName") String previousName, @Param("name") String name);
}
