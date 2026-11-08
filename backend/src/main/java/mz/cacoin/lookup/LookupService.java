package mz.cacoin.lookup;

import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import mz.cacoin.common.StudentCodes;
import mz.cacoin.students.Student;
import mz.cacoin.students.StudentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Resolve o código de estudante (CACOIN{ano}{número}) para o identificador interno. */
@Service
@RequiredArgsConstructor
public class LookupService {
  private static final Pattern CODE = Pattern.compile("^CACOIN(\\d{4})(\\d{2,9})$");

  private final StudentRepository students;

  @Transactional(readOnly = true)
  public Long studentId(String code) {
    String wanted = code == null ? "" : code.trim().toUpperCase(Locale.ROOT);
    if (wanted.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indique o código do estudante");
    }
    Matcher matcher = CODE.matcher(wanted);
    if (matcher.matches()) {
      Optional<Student> direct = students.findByStudentYearAndStudentNumber(
          Integer.valueOf(matcher.group(1)), Integer.valueOf(matcher.group(2)));
      if (direct.filter(student -> StudentCodes.of(student).equalsIgnoreCase(wanted)).isPresent()) {
        return direct.get().getId();
      }
    }
    return students.findAll().stream()
        .filter(student -> StudentCodes.of(student).equalsIgnoreCase(wanted))
        .map(Student::getId)
        .findFirst()
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O estudante não foi encontrado"));
  }
}
