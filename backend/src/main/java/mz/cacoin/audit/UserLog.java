package mz.cacoin.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "user_logs")
@Getter
@Setter
@NoArgsConstructor
public class UserLog {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "account_id")
  private Long accountId;

  @Column(name = "actor_code", nullable = false, length = 60)
  private String actorCode;

  @Column(nullable = false, length = 20)
  private String action;

  @Column(name = "entity_name", nullable = false, length = 80)
  private String entityName;

  @Column(name = "entity_id")
  private Long entityId;

  @Column(name = "entity_ref", length = 160)
  private String entityRef;

  @Column(columnDefinition = "TEXT")
  private String changes;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
