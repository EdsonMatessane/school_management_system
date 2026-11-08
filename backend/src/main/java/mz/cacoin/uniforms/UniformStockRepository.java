package mz.cacoin.uniforms;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UniformStockRepository extends JpaRepository<UniformStock, Long> {
  List<UniformStock> findAllByOrderByIdAsc();

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select stock from UniformStock stock where stock.size = :size")
  Optional<UniformStock> findBySizeForUpdate(@Param("size") String size);
}
