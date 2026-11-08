package mz.cacoin.modules.disciplines;

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
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import mz.cacoin.courses.Course;

@Entity
@Table(
    name = "course_disciplines",
    uniqueConstraints = {
      @UniqueConstraint(
          name = "uq_course_disciplines_course_number",
          columnNames = {"course_id", "discipline_number"}),
      @UniqueConstraint(columnNames = {"course_id", "name"})
    })
@Getter
@Setter
@NoArgsConstructor
public class Discipline {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "course_id", nullable = false)
  private Course course;

  @Column(name = "discipline_number", nullable = false)
  private Integer disciplineNumber;

  @Column(nullable = false, length = 120)
  private String name;

  @Column(nullable = false)
  private boolean active = true;
}
