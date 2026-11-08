package mz.cacoin.common;

import mz.cacoin.settings.SystemDate;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Locale;
import mz.cacoin.students.Student;

public final class StudentCodes {
  private StudentCodes() {}

  public static String of(Student student) {
    long number = student.getStudentNumber() != null
        ? student.getStudentNumber() : student.getId();
    int year = student.getStudentYear() != null
        ? student.getStudentYear()
        : student.getCreatedAt() != null
            ? student.getCreatedAt().atZone(ZoneId.systemDefault()).getYear()
            : SystemDate.today().getYear();
    return String.format(Locale.ROOT, "CACOIN%d%02d", year, number);
  }

  public static String of(Long id, Number number, Number year, Instant createdAt) {
    long value = number != null ? number.longValue() : id != null ? id : 0L;
    int studentYear = year != null
        ? year.intValue()
        : createdAt != null
            ? createdAt.atZone(ZoneId.systemDefault()).getYear()
            : SystemDate.today().getYear();
    return String.format(Locale.ROOT, "CACOIN%d%02d", studentYear, value);
  }
}
