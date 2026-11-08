package mz.cacoin.internalexpenses;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InternalExpenseRepository extends JpaRepository<InternalExpense, Long> {
  List<InternalExpense> findAllByOrderByCreatedAtDescIdDesc();

  boolean existsBySupplierId(Long supplierId);

  boolean existsByCategoryIdAndExternalDocumentNumberIgnoreCase(
      Long categoryId, String externalDocumentNumber);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from InternalExpense e where e.id = :id")
  Optional<InternalExpense> findByIdForUpdate(@Param("id") Long id);
}
