package mz.cacoin.pautas;

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
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import mz.cacoin.courses.Course;
import mz.cacoin.students.Student;

@Entity
@Table(
    name = "pauta_entries",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_pauta_entries_student_year", columnNames = {"student_id", "academic_year"}))
@Getter
@Setter
@NoArgsConstructor
public class PautaEntry {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "student_id", nullable = false)
  private Student student;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "course_id", nullable = false)
  private Course course;

  @Column(name = "academic_year", nullable = false)
  private int academicYear;

  @Column(nullable = false, precision = 4, scale = 2)
  private BigDecimal t1;

  @Column(nullable = false, precision = 4, scale = 2)
  private BigDecimal t2;

  @Column(nullable = false, precision = 4, scale = 2)
  private BigDecimal t3;

  @Column(nullable = false, precision = 4, scale = 2)
  private BigDecimal t4;

  @Column(nullable = false, precision = 4, scale = 2)
  private BigDecimal t5;

  @Column(nullable = false, precision = 4, scale = 2)
  private BigDecimal t6;

  @Column(nullable = false)
  private int frequency;

  @Column(nullable = false, precision = 4, scale = 2)
  private BigDecimal exam1;

  @Column(nullable = false, precision = 4, scale = 2)
  private BigDecimal exam2;

  @Column(name = "work_grade", nullable = false, precision = 4, scale = 2)
  private BigDecimal work;

  @Column(name = "final_average", nullable = false)
  private int finalAverage;

  @Column(nullable = false, length = 10)
  private String result;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @PrePersist
  private void setCreatedAtIfMissing() {
    if (createdAt == null) {
      createdAt = Instant.now();
    }
  }
}
