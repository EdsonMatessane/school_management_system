package mz.cacoin.onlineclasses;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OnlineMaterialRepository extends JpaRepository<OnlineMaterial, Long> {
    List<OnlineMaterial> findAllByLessonIdIn(Collection<Long> lessonIds);
}
