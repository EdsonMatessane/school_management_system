package mz.cacoin.assessments;

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
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import mz.cacoin.students.Student;

@Entity
@Table(
    name = "assessment_sheet_students",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_assessment_sheet_students", columnNames = {"sheet_id", "student_id"}))
@Getter
@Setter
@NoArgsConstructor
public class AssessmentSheetStudent {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "sheet_id", nullable = false)
  private AssessmentSheet sheet;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "student_id", nullable = false)
  private Student student;

  /** Quando o estudante entrou no registo; vazio nos registos anteriores a esta regra. */
  @Column(name = "created_at")
  private Instant createdAt;

  /** Quando o registo do estudante foi concluído (passa para o histórico). */
  @Column(name = "completed_at")
  private Instant completedAt;

  @PrePersist
  void onCreate() {
    if (createdAt == null) {
      createdAt = Instant.now();
    }
  }
}
