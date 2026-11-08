package mz.cacoin.audit;

import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UserLogRepository extends JpaRepository<UserLog, Long> {
  List<UserLog> findAllByAccountIdOrderByCreatedAtDescIdDesc(Long accountId, Pageable pageable);

  List<UserLog> findAllByOrderByCreatedAtDescIdDesc(Pageable pageable);

  @Query("select l.accountId, count(l), max(l.createdAt) from UserLog l group by l.accountId")
  List<Object[]> summarize();
}
