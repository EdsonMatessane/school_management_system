package mz.cacoin.students.tests;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StudentTestGradeRepository extends JpaRepository<StudentTestGrade, Long> {
  @Query("""
      select g
      from StudentTestGrade g
      join fetch g.student s
      where g.test.id = :testId
      order by s.id asc
      """)
  List<StudentTestGrade> findAllByTestId(@Param("testId") Long testId);

  @Query("select g from StudentTestGrade g join fetch g.test t where g.student.id = :studentId order by t.id desc")
  List<StudentTestGrade> findAllByStudentIdWithTest(@Param("studentId") Long studentId);

  boolean existsByStudentId(Long studentId);

  boolean existsByTestIdAndStudentId(Long testId, Long studentId);

  @Query("select max(g.grade) from StudentTestGrade g where g.test.id = :testId")
  BigDecimal findHighestGradeByTestId(@Param("testId") Long testId);

  @Modifying
  @Query("delete from StudentTestGrade g where g.test.id = :testId")
  void deleteAllByTestId(@Param("testId") Long testId);
}
