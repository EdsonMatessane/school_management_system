package mz.cacoin.internalexpenses;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InternalExpenseSupplierRepository
    extends JpaRepository<InternalExpenseSupplier, Long> {
  List<InternalExpenseSupplier> findAllByOrderByLegalNameAsc();
}
