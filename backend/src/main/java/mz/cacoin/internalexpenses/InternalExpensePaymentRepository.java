package mz.cacoin.internalexpenses;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InternalExpensePaymentRepository
    extends JpaRepository<InternalExpensePayment, Long> {
  List<InternalExpensePayment> findAllByExpenseIdOrderByCreatedAtDesc(Long expenseId);

  List<InternalExpensePayment> findAllByOrderByCreatedAtDesc();
}
