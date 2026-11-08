package mz.cacoin.students;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
    name = "student_fee_charges",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_student_fee_charges_type_period",
        columnNames = {"enrollment_id", "fee_type", "period_label"}))
@Getter
@Setter
@NoArgsConstructor
public class StudentFeeCharge {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "enrollment_id", nullable = false)
  private StudentEnrollment enrollment;

  @Column(name = "fee_type", nullable = false, length = 20)
  private String feeType;

  @Column(name = "description", nullable = false, columnDefinition = "TEXT")
  private String description;

  @Column(name = "period_label", length = 20)
  private String periodLabel;

  @Column(nullable = false, precision = 12, scale = 2)
  private BigDecimal amount;

  @Column(name = "due_date")
  private LocalDate dueDate;

  /** Multa por atraso, fixada quando a mensalidade passa o prazo (percentagem da mensalidade). */
  @Column(name = "fine_amount", precision = 12, scale = 2)
  private BigDecimal fineAmount;

  @Column(name = "fine_percent", precision = 5, scale = 2)
  private BigDecimal finePercent;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @jakarta.persistence.PrePersist
  private void setCreatedAtIfMissing() {
    if (createdAt == null) createdAt = Instant.now();
  }
}
