package mz.cacoin.students;

import org.springframework.data.jpa.repository.JpaRepository;

public interface StudentRepository extends JpaRepository<Student, Long> {
  @org.springframework.data.jpa.repository.Query(
      value = "SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext('student_number'))) lock_row",
      nativeQuery = true)
  Integer lockStudentNumbering();

  @org.springframework.data.jpa.repository.Query(
      "select coalesce(max(s.studentNumber), 0) + 1 from Student s where s.studentYear = :year")
  Integer nextStudentNumber(@org.springframework.data.repository.query.Param("year") int year);

  java.util.List<Student> findAllByOrderByIdAsc();

  java.util.Optional<Student> findByStudentYearAndStudentNumber(Integer studentYear, Integer studentNumber);

  boolean existsByBiNumberIgnoreCase(String biNumber);

  boolean existsByBiNumberIgnoreCaseAndIdNot(String biNumber, Long id);

  boolean existsByNuit(String nuit);

  boolean existsByNuitAndIdNot(String nuit, Long id);
}
