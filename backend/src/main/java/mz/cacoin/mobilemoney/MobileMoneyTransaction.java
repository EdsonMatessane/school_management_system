package mz.cacoin.mobilemoney;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "mobile_money_transactions")
@Getter
@Setter
@NoArgsConstructor
public class MobileMoneyTransaction {
  public static final String PENDING = "PENDING";
  public static final String SUCCESS = "SUCCESS";
  public static final String FAILED = "FAILED";

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(unique = true, length = 30)
  private String reference;

  @Column(name = "student_id", nullable = false)
  private Long studentId;

  @Column(nullable = false, length = 30)
  private String kind;

  @Column(name = "item_id", nullable = false)
  private Long itemId;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String description;

  @Column(nullable = false, precision = 12, scale = 2)
  private BigDecimal amount;

  @Column(nullable = false, length = 20)
  private String wallet;

  @Column(nullable = false, length = 20)
  private String phone;

  @Column(name = "destination_number", length = 20)
  private String destinationNumber;

  @Column(nullable = false, length = 60)
  private String status = PENDING;

  @Column(name = "provider_reference", length = 80)
  private String providerReference;

  @Column(name = "failure_reason", columnDefinition = "TEXT")
  private String failureReason;

  @Column(nullable = false)
  private boolean recorded;

  @Column(name = "initiated_account_id")
  private Long initiatedAccountId;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "completed_at")
  private Instant completedAt;

  @PrePersist
  private void setCreatedAtIfMissing() {
    if (createdAt == null) {
      createdAt = Instant.now();
    }
  }
}
