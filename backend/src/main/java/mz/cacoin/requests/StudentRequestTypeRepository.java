package mz.cacoin.requests;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudentRequestTypeRepository extends JpaRepository<StudentRequestType, Long> {
  List<StudentRequestType> findAllByOrderByIdAsc();

  boolean existsByNameIgnoreCase(String name);

  boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}
