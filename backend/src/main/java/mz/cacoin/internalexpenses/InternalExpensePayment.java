package mz.cacoin.internalexpenses;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "internal_expense_payments")
@Getter
@Setter
@NoArgsConstructor
public class InternalExpensePayment {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true, length = 32)
  private String reference;

  @Column(name = "expense_id", nullable = false)
  private Long expenseId;

  @Column(name = "payment_date", nullable = false)
  private LocalDate paymentDate;

  @Column(nullable = false, precision = 14, scale = 2)
  private BigDecimal amount;

  @Column(nullable = false, length = 80)
  private String method;

  @Column(name = "external_reference", length = 160)
  private String externalReference;

  @Column(name = "recorded_by", nullable = false, length = 180)
  private String recordedBy;

  @Column(nullable = false)
  private boolean reversed;

  @Column(name = "reversal_reason", columnDefinition = "TEXT")
  private String reversalReason;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @PrePersist
  void onCreate() {
    if (createdAt == null) createdAt = Instant.now();
  }
}
