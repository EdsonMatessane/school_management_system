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
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import mz.cacoin.staff.StaffMember;

@Entity
@Table(
    name = "finance_salary_registrations",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_finance_salary_registrations_staff", columnNames = {"staff_id"}))
@Getter
@Setter
@NoArgsConstructor
public class SalaryRegistration {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "staff_id", nullable = false)
  private StaffMember staff;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "position_id", nullable = false)
  private FinancePosition position;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "salary_type_id", nullable = false)
  private FinanceSalaryType salaryType;

  @Column(nullable = false, precision = 12, scale = 2)
  private BigDecimal salary;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "bonus_type_id")
  private FinanceBonusType bonusType;

  @Column(nullable = false, precision = 12, scale = 2)
  private BigDecimal bonus = BigDecimal.ZERO;

  @Column(length = 500)
  private String observation;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @PrePersist
  private void setCreatedAtIfMissing() {
    if (createdAt == null) {
      createdAt = Instant.now();
    }
  }
}
