package mz.cacoin.mobilemoney;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MobileMoneyTransactionRepository
    extends JpaRepository<MobileMoneyTransaction, Long> {
  List<MobileMoneyTransaction> findAllByOrderByCreatedAtDescIdDesc();

  List<MobileMoneyTransaction> findAllByStatus(String status);

  boolean existsByKindAndItemIdAndStatus(String kind, Long itemId, String status);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select t from MobileMoneyTransaction t where t.id = :id")
  Optional<MobileMoneyTransaction> findByIdForUpdate(@Param("id") Long id);
}
