package mz.cacoin.courses;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import mz.cacoin.courses.categories.Category;
import mz.cacoin.courses.enrollmentfees.EnrollmentFee;
import mz.cacoin.courses.levels.Level;
import mz.cacoin.courses.manualfees.ManualFee;
import mz.cacoin.courses.modalities.Modality;
import mz.cacoin.courses.monthlyfees.MonthlyFee;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
    name = "courses",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_courses_name_modality", columnNames = {"name", "modality_id"}))
@Getter
@Setter
@NoArgsConstructor
public class Course {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String name;

  @Column(name = "duration_months")
  private Integer durationMonths;

  @Column(name = "next_module_number", nullable = false)
  private Integer nextModuleNumber = 1;

  @Column(name = "next_discipline_number", nullable = false)
  private Integer nextDisciplineNumber = 1;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "category_id", nullable = false)
  private Category category;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "level_id", nullable = false)
  private Level level;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "modality_id", nullable = false)
  private Modality modality;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "monthly_fee_id", nullable = false)
  private MonthlyFee monthlyFee;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "enrollment_fee_id", nullable = false)
  private EnrollmentFee enrollmentFee;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "manual_fee_id", nullable = false)
  private ManualFee manualFee;

  @Column(nullable = false)
  private boolean active = true;
}
