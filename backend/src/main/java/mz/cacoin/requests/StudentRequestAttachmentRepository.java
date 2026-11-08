package mz.cacoin.requests;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudentRequestAttachmentRepository
    extends JpaRepository<StudentRequestAttachment, Long> {
  List<StudentRequestAttachment> findAllByRequestIdInOrderByIdAsc(Collection<Long> requestIds);
}
