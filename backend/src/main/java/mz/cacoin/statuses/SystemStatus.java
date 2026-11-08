package mz.cacoin.statuses;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
    name = "system_statuses",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_system_statuses_module_code", columnNames = {"module", "code"}))
@Getter
@Setter
@NoArgsConstructor
public class SystemStatus {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 40)
  private String module;

  @Column(nullable = false, length = 60)
  private String code;

  @Column(nullable = false, length = 120)
  private String label;

  @Column(nullable = false, length = 20)
  private String tone = "pending";

  @Column(name = "sort_order", nullable = false)
  private Integer sortOrder = 0;

  @Column(nullable = false)
  private boolean active = true;

  @Column(name = "system_defined", nullable = false)
  private boolean systemDefined = false;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @PrePersist
  private void setCreatedAtIfMissing() {
    if (createdAt == null) {
      createdAt = Instant.now();
    }
  }
}
