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
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import mz.cacoin.courses.Course;

@Entity
@Table(name = "student_enrollments")
@Getter
@Setter
@NoArgsConstructor
public class StudentEnrollment {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "student_id", nullable = false)
  private Student student;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "course_id")
  private Course course;

  @Column(name = "course_name", columnDefinition = "TEXT")
  private String courseName;

  @Column(name = "category_name", columnDefinition = "TEXT")
  private String categoryName;

  @Column(name = "level_name", columnDefinition = "TEXT")
  private String levelName;

  @Column(name = "modality_name", columnDefinition = "TEXT")
  private String modalityName;

  @Column(name = "duration_months")
  private Integer durationMonths;

  @Column(name = "monthly_fee_type", columnDefinition = "TEXT")
  private String monthlyFeeType;

  @Column(name = "monthly_fee_amount", precision = 12, scale = 2)
  private BigDecimal monthlyFeeAmount;

  @Column(name = "enrollment_fee_type", columnDefinition = "TEXT")
  private String enrollmentFeeType;

  @Column(name = "enrollment_fee_amount", precision = 12, scale = 2)
  private BigDecimal enrollmentFeeAmount;

  @Column(name = "manual_fee_type", columnDefinition = "TEXT")
  private String manualFeeType;

  @Column(name = "manual_fee_amount", precision = 12, scale = 2)
  private BigDecimal manualFeeAmount;

  @Column(name = "enrollment_date")
  private LocalDate enrollmentDate;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
