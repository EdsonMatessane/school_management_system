package mz.cacoin.audit;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecordAuditRepository extends JpaRepository<RecordAudit, Long> {
  Optional<RecordAudit> findByEntityNameAndEntityId(String entityName, Long entityId);
}
