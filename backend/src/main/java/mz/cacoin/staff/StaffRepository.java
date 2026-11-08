package mz.cacoin.staff;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StaffRepository extends JpaRepository<StaffMember, Long> {
  List<StaffMember> findAllByStaffTypeOrderByIdAsc(String staffType);

  boolean existsByDocumentTypeId(Long documentTypeId);
}
