package mz.cacoin.onlineclasses;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OnlineLessonRepository extends JpaRepository<OnlineLesson, Long> {
    List<OnlineLesson> findAllByCourseIdOrderByStartAtAsc(Long courseId);
}
