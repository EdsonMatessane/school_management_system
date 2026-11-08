package mz.cacoin.finance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "finance_settings")
@Getter
@Setter
@NoArgsConstructor
public class FinanceSettings {
  @Id
  private Long id = 1L;

  @Column(name = "processing_period_start")
  private LocalDateTime processingPeriodStart;

  @Column(name = "processing_period_end")
  private LocalDateTime processingPeriodEnd;

  @Column(name = "payment_rule", nullable = false, length = 10)
  private String paymentRule = "FULL";

  @Column(name = "max_advance_months", nullable = false)
  private int maxAdvanceMonths = 1;
}
