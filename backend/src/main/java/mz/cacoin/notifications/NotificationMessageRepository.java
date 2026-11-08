package mz.cacoin.notifications;

import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationMessageRepository extends JpaRepository<NotificationMessage, Long> {
  @EntityGraph(attributePaths = {"staffMember", "student"})
  List<NotificationMessage> findAllByOrderByCreatedAtDescIdDesc();

  @EntityGraph(attributePaths = {"staffMember", "student"})
  List<NotificationMessage> findAllByChannelOrderByCreatedAtDescIdDesc(String channel);

  List<NotificationMessage> findAllByStudentIdOrderByCreatedAtDescIdDesc(Long studentId);
}
