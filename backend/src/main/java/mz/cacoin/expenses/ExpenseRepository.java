package mz.cacoin.expenses;

import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
  @EntityGraph(attributePaths = {"expenseType", "serviceType"})
  List<Expense> findAllByOrderByServiceDateDescIdDesc();

  boolean existsByExpenseTypeId(Long catalogItemId);

  boolean existsByServiceTypeId(Long catalogItemId);
}
