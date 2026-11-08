package mz.cacoin.internalexpenses;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InternalExpenseBudgetRepository
    extends JpaRepository<InternalExpenseBudget, Long> {
  List<InternalExpenseBudget> findAllByOrderByPeriodStartDescNameAsc();
}
