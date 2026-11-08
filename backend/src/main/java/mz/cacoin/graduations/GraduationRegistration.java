package mz.cacoin.graduations;

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
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import mz.cacoin.courses.Course;
import mz.cacoin.students.Student;

@Entity
@Table(name = "graduation_registrations")
@Getter
@Setter
@NoArgsConstructor
public class GraduationRegistration {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "student_id", nullable = false)
  private Student student;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "course_id", nullable = false)
  private Course course;

  @Column(nullable = false)
  private int guests = 0;

  @Column(name = "fee_amount", nullable = false, precision = 12, scale = 2)
  private BigDecimal feeAmount;

  @Column(name = "requirements_amount", nullable = false, precision = 12, scale = 2)
  private BigDecimal requirementsAmount;

  @Column(name = "extra_guests_amount", nullable = false, precision = 12, scale = 2)
  private BigDecimal extraGuestsAmount;

  @Column(nullable = false, precision = 12, scale = 2)
  private BigDecimal amount;

  @Column(nullable = false)
  private boolean paid = false;

  @Column(nullable = false)
  private boolean graduated = false;

  @Column(name = "graduation_date")
  private LocalDate graduationDate;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @PrePersist
  private void setCreatedAtIfMissing() {
    if (createdAt == null) {
      createdAt = Instant.now();
    }
  }
}
