package mz.cacoin.students.exams;

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
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import mz.cacoin.courses.Course;
import mz.cacoin.modules.Module;
import mz.cacoin.modules.disciplines.Discipline;

@Entity
@Table(name = "student_exams")
@Getter
@Setter
@NoArgsConstructor
public class StudentExam {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "course_id", nullable = false)
  private Course course;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "module_id")
  private Module module;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "discipline_id")
  private Discipline discipline;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String name;

  @Column(name = "max_grade", nullable = false, precision = 4, scale = 2)
  private BigDecimal maxGrade;

  @Column(nullable = false)
  private boolean completed = false;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @PrePersist
  private void setCreatedAtIfMissing() {
    if (createdAt == null) {
      createdAt = Instant.now();
    }
  }
}
