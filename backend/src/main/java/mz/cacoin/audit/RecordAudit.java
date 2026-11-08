package mz.cacoin.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
    name = "record_audits",
    uniqueConstraints = @UniqueConstraint(columnNames = {"entity_name", "entity_id"}))
@Getter
@Setter
@NoArgsConstructor
public class RecordAudit {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "entity_name", nullable = false, length = 80)
  private String entityName;

  @Column(name = "entity_id", nullable = false)
  private Long entityId;

  @Column(name = "entry_account_id")
  private Long entryAccountId;

  @Column(name = "entered_at")
  private Instant enteredAt;

  @Column(name = "authorization_account_id")
  private Long authorizationAccountId;

  @Column(name = "authorized_at")
  private Instant authorizedAt;
}
