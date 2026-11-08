package mz.cacoin.users;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {
  @Query(
      value = "SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext('admin_number'))) lock_row",
      nativeQuery = true)
  Integer lockAdminNumbering();

  @Query("select coalesce(max(a.adminNumber), 0) + 1 from UserAccount a where a.kind = 'ADMIN'")
  Integer nextAdminNumber();

  List<UserAccount> findAllByKindOrderByIdAsc(String kind);

  Optional<UserAccount> findByCodeIgnoreCase(String code);

  boolean existsByKind(String kind);

  long countByKindAndStatus(String kind, String status);
}
