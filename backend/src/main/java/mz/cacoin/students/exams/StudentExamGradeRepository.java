package mz.cacoin.students.exams;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StudentExamGradeRepository extends JpaRepository<StudentExamGrade, Long> {
  @Query("""
      select g
      from StudentExamGrade g
      join fetch g.student s
      where g.exam.id = :examId
      order by s.id asc
      """)
  List<StudentExamGrade> findAllByExamId(@Param("examId") Long examId);

  @Query("select g from StudentExamGrade g join fetch g.exam e where g.student.id = :studentId order by e.id desc")
  List<StudentExamGrade> findAllByStudentIdWithExam(@Param("studentId") Long studentId);

  boolean existsByStudentId(Long studentId);

  boolean existsByExamIdAndStudentId(Long examId, Long studentId);

  @Query("select max(g.grade) from StudentExamGrade g where g.exam.id = :examId")
  BigDecimal findHighestGradeByExamId(@Param("examId") Long examId);

  @Modifying
  @Query("delete from StudentExamGrade g where g.exam.id = :examId")
  void deleteAllByExamId(@Param("examId") Long examId);
}
