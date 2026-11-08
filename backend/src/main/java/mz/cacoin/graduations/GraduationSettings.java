package mz.cacoin.graduations;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "graduation_settings")
@Getter
@Setter
@NoArgsConstructor
public class GraduationSettings {
  @Id
  private Long id = 1L;

  @Column(name = "graduation_fee", nullable = false, precision = 12, scale = 2)
  private BigDecimal graduationFee = BigDecimal.ZERO;

  @Column(name = "graduation_fee_active", nullable = false)
  private boolean graduationFeeActive = true;

  @Column(name = "included_guests", nullable = false)
  private int includedGuests = 2;

  @Column(name = "extra_guest_fee", nullable = false, precision = 12, scale = 2)
  private BigDecimal extraGuestFee = BigDecimal.ZERO;

  @Column(name = "extra_guest_fee_active", nullable = false)
  private boolean extraGuestFeeActive = true;

  @Column(name = "special_exam_fee", nullable = false, precision = 12, scale = 2)
  private BigDecimal specialExamFee = BigDecimal.ZERO;

  @Column(name = "special_exam_fee_active", nullable = false)
  private boolean specialExamFeeActive = true;

  @Column(name = "graduation_period_start")
  private LocalDateTime periodStart;

  @Column(name = "graduation_period_end")
  private LocalDateTime periodEnd;

  @Column(name = "ceremony_date")
  private LocalDate ceremonyDate;

  @Column(name = "ceremony_start_time")
  private LocalTime ceremonyStartTime;

  @Column(name = "ceremony_end_time")
  private LocalTime ceremonyEndTime;
}
