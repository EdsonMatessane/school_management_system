package mz.cacoin.internalexpenses;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "internal_expense_budgets")
@Getter
@Setter
@NoArgsConstructor
public class InternalExpenseBudget {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 140)
  private String name;

  @Column(name = "period_start", nullable = false)
  private LocalDate periodStart;

  @Column(name = "period_end", nullable = false)
  private LocalDate periodEnd;

  @Column(nullable = false, length = 3)
  private String currency = "MZN";

  @Column(name = "approved_amount", nullable = false, precision = 14, scale = 2)
  private BigDecimal approvedAmount;

  @Column(name = "department", nullable = false, length = 120)
  private String department;

  @Column(name = "cost_center", length = 120)
  private String costCenter;

  @Column(name = "category_id")
  private Long categoryId;

  @Column(nullable = false)
  private boolean active = true;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @PrePersist
  @PreUpdate
  void onSave() {
    if (createdAt == null) createdAt = Instant.now();
    if (name != null) name = name.trim();
    if (department != null) department = department.trim();
  }
}
