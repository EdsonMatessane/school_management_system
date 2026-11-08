package mz.cacoin.staffdocuments;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StaffDocumentRepository extends JpaRepository<StaffDocument, Long> {
  @EntityGraph(attributePaths = {"type"})
  List<StaffDocument> findAllByStaffIdOrderByIdAsc(Long staffId);

  @EntityGraph(attributePaths = {"staff", "type"})
  List<StaffDocument> findAllByExpiryDateIsNotNullOrderByExpiryDateAscIdAsc();

  @EntityGraph(attributePaths = {"staff", "type"})
  List<StaffDocument> findAllByExpiryDateBetweenOrderByExpiryDateAscIdAsc(
      LocalDate from, LocalDate to);

  boolean existsByTypeId(Long typeId);

  boolean existsByStaffId(Long staffId);

  void deleteAllByStaffId(Long staffId);
}
