package mz.cacoin.photos;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PersonPhotoRepository extends JpaRepository<PersonPhoto, Long> {
  Optional<PersonPhoto> findByStudentId(Long studentId);

  Optional<PersonPhoto> findByStaffId(Long staffId);

  List<PersonPhoto> findByStudentIdIn(Collection<Long> studentIds);

  void deleteByStudentId(Long studentId);

  void deleteByStaffId(Long staffId);
}
