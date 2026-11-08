package mz.cacoin.assessments;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import mz.cacoin.staff.StaffMember;

@Entity
@Table(
    name = "assessment_sheet_teachers",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_assessment_sheet_teachers", columnNames = {"sheet_id", "teacher_id"}))
@Getter
@Setter
@NoArgsConstructor
public class AssessmentSheetTeacher {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "sheet_id", nullable = false)
  private AssessmentSheet sheet;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "teacher_id", nullable = false)
  private StaffMember teacher;
}
