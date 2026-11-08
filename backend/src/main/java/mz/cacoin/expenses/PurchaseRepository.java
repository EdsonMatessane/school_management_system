package mz.cacoin.expenses;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PurchaseRepository extends JpaRepository<Purchase, Long> {
  List<Purchase> findAllByOrderByRequestDateDescIdDesc();
}
