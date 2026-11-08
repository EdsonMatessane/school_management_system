package mz.cacoin.partitions;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SystemPartitionRepository extends JpaRepository<SystemPartition, Long> {
  List<SystemPartition> findAllByOrderByIdDesc();

  boolean existsByDatabaseName(String databaseName);

  List<SystemPartition> findAllByActiveTrueOrderByIdAsc();
}
