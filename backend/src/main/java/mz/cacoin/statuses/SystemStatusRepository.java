package mz.cacoin.statuses;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SystemStatusRepository extends JpaRepository<SystemStatus, Long> {
  List<SystemStatus> findAllByModuleInOrderByModuleAscSortOrderAscIdAsc(List<String> modules);

  List<SystemStatus> findAllByModuleOrderBySortOrderAscIdAsc(String module);

  Optional<SystemStatus> findByModuleAndCode(String module, String code);

  boolean existsByModuleAndCode(String module, String code);

  boolean existsByModuleAndLabelIgnoreCase(String module, String label);

  boolean existsByModuleAndLabelIgnoreCaseAndIdNot(String module, String label, Long id);

  long countByModuleAndActiveTrue(String module);
}
