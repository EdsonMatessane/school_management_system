package mz.cacoin.leaves;

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
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import mz.cacoin.staff.StaffMember;

@Entity
@Table(name = "leave_requests")
@Getter
@Setter
@NoArgsConstructor
public class LeaveRequest {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "staff_id", nullable = false)
  private StaffMember staffMember;

  @Column(name = "request_date", nullable = false)
  private LocalDate requestDate;

  @Column(name = "leave_date", nullable = false)
  private LocalDate leaveDate;

  @Column(name = "return_date", nullable = false)
  private LocalDate returnDate;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String reason;

  @Column(name = "days_calculated", nullable = false)
  private Integer daysCalculated;

  @Column(nullable = false, length = 60)
  private String status;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @PrePersist
  private void setCreatedAtIfMissing() {
    if (createdAt == null) {
      createdAt = Instant.now();
    }
  }
}
