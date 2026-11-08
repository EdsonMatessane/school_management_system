package mz.cacoin.expenses;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PurchaseReturnRepository extends JpaRepository<PurchaseReturn, Long> {
  List<PurchaseReturn> findAllByOrderByReturnDateDescIdDesc();

  boolean existsByPurchaseIdAndStatus(Long purchaseId, String status);
}
