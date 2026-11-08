package mz.cacoin.finance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import mz.cacoin.staff.StaffMember;

@Entity
@Table(
    name = "finance_salary_payments",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_finance_salary_payments_staff_month",
        columnNames = {"staff_id", "reference_month"}))
@Getter
@Setter
@NoArgsConstructor
public class SalaryPayment {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "staff_id", nullable = false)
  private StaffMember staff;

  @Column(name = "reference_month", nullable = false)
  private LocalDate referenceMonth;

  @Column(nullable = false, length = 12)
  private String kind;

  @Column(name = "salary_amount", nullable = false, precision = 12, scale = 2)
  private BigDecimal salaryAmount;

  @Column(name = "paid_amount", nullable = false, precision = 12, scale = 2)
  private BigDecimal paidAmount;

  @Column(name = "bonus_amount", nullable = false, precision = 12, scale = 2)
  private BigDecimal bonusAmount = BigDecimal.ZERO;

  @Column(name = "discounted_balance", nullable = false, precision = 12, scale = 2)
  private BigDecimal discountedBalance = BigDecimal.ZERO;

  @Column(length = 500)
  private String observation;

  @Column(name = "processed_at", nullable = false)
  private Instant processedAt;

  @Column(name = "liquidated_at")
  private Instant liquidatedAt;

  @PrePersist
  private void setProcessedAtIfMissing() {
    if (processedAt == null) {
      processedAt = Instant.now();
    }
  }
}
