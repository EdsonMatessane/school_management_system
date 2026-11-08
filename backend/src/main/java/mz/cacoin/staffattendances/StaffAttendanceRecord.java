package mz.cacoin.staffattendances;

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
    name = "staff_attendance_records",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_staff_attendance_staff_date", columnNames = {"staff_id", "attendance_date"}))
@Getter
@Setter
@NoArgsConstructor
public class StaffAttendanceRecord {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "staff_id", nullable = false)
  private StaffMember staff;

  @Column(name = "attendance_date", nullable = false)
  private LocalDate attendanceDate;

  @Column(nullable = false, length = 10)
  private String status;

  @Column(name = "justification_fee", precision = 12, scale = 2)
  private BigDecimal justificationFee;

  @Column(name = "justification_date")
  private LocalDate justificationDate;

  @Column(name = "justification_paid", nullable = false)
  private boolean justificationPaid = false;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @PrePersist
  private void setCreatedAtIfMissing() {
    if (createdAt == null) {
      createdAt = Instant.now();
    }
  }
}
