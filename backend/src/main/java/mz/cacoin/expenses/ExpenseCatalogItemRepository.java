package mz.cacoin.expenses;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpenseCatalogItemRepository extends JpaRepository<ExpenseCatalogItem, Long> {
  List<ExpenseCatalogItem> findAllByKindOrderByIdAsc(String kind);

  List<ExpenseCatalogItem> findAllByOrderByKindAscIdAsc();

  boolean existsByKindAndNameIgnoreCase(String kind, String name);

  boolean existsByKindAndNameIgnoreCaseAndIdNot(String kind, String name, Long id);
}
