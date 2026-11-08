package mz.cacoin.internalexpenses;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InternalExpenseCategoryRepository
    extends JpaRepository<InternalExpenseCategory, Long> {
  List<InternalExpenseCategory> findAllByOrderByNameAsc();
}
