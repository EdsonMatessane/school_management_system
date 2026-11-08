package mz.cacoin.tests;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "test_settings")
@Getter
@Setter
@NoArgsConstructor
public class TestSettings {
  @Id
  private Long id = 1L;

  @Column(name = "normal_fee", nullable = false, precision = 12, scale = 2)
  private BigDecimal normalFee = BigDecimal.ZERO;

  @Column(name = "recovery_fee", nullable = false, precision = 12, scale = 2)
  private BigDecimal recoveryFee = BigDecimal.ZERO;

  @Column(name = "special_fee", nullable = false, precision = 12, scale = 2)
  private BigDecimal specialFee = BigDecimal.ZERO;

  @Column(name = "normal_fee_active", nullable = false)
  private boolean normalFeeActive = false;

  @Column(name = "recovery_fee_active", nullable = false)
  private boolean recoveryFeeActive = false;

  @Column(name = "special_fee_active", nullable = false)
  private boolean specialFeeActive = false;

  @Column(name = "test_period_start")
  private LocalDateTime testPeriodStart;

  @Column(name = "test_period_end")
  private LocalDateTime testPeriodEnd;

  @Column(name = "grade_release_start")
  private LocalDateTime gradeReleaseStart;

  @Column(name = "grade_release_end")
  private LocalDateTime gradeReleaseEnd;
}
