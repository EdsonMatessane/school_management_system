package mz.cacoin.staffdocuments;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StaffDocumentTypeRepository extends JpaRepository<StaffDocumentType, Long> {
  List<StaffDocumentType> findAllByOrderByIdAsc();

  boolean existsByNameIgnoreCase(String name);

  boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}
