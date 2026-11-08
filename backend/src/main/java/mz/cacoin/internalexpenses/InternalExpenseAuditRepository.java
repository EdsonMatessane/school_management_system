package mz.cacoin.internalexpenses;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InternalExpenseAuditRepository extends JpaRepository<InternalExpenseAudit, Long> {
  List<InternalExpenseAudit> findAllByExpenseIdOrderByCreatedAtDesc(Long expenseId);
}
