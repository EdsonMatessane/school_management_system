package mz.cacoin.mobilemoney;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.function.Predicate;
import lombok.RequiredArgsConstructor;
import mz.cacoin.attendances.AttendanceService;
import mz.cacoin.common.StudentCodes;
import mz.cacoin.exams.ExamRegistrationService;
import mz.cacoin.graduations.GraduationRegistrationService;
import mz.cacoin.students.Student;
import mz.cacoin.students.StudentEnrollment;
import mz.cacoin.students.StudentEnrollmentRepository;
import mz.cacoin.students.StudentFeeService;
import mz.cacoin.students.StudentRepository;
import mz.cacoin.suspensions.SuspensionRegistrationService;
import mz.cacoin.tests.TestRegistrationService;
import mz.cacoin.uniforms.UniformOrderService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Component
@RequiredArgsConstructor
public class MobileMoneyPayables {
  private static final java.util.regex.Pattern CODE =
      java.util.regex.Pattern.compile("CACOIN(\\d{4})(\\d{2,9})");

  private final StudentRepository students;
  private final StudentEnrollmentRepository enrollments;
  private final StudentFeeService fees;
  private final TestRegistrationService tests;
  private final ExamRegistrationService exams;
  private final UniformOrderService uniforms;
  private final GraduationRegistrationService graduations;
  private final SuspensionRegistrationService suspensions;
  private final AttendanceService attendances;
  private final MobileMoneyTransactionRepository transactions;

  @Transactional
  public MobileMoneyDtos.StudentPayables forCode(String code) {
    return build(findStudent(code));
  }

  @Transactional
  public MobileMoneyDtos.PayableItem find(Student student, MobileMoneyKind kind, Long itemId) {
    return build(student).groups().stream()
        .filter(group -> group.kind().equals(kind.name()))
        .flatMap(group -> group.items().stream())
        .filter(item -> item.itemId().equals(itemId))
        .findFirst()
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.CONFLICT, "O item não existe ou já está pago"));
  }

  private Student findStudent(String code) {
    String wanted = code == null ? "" : code.trim().toUpperCase(Locale.ROOT);
    java.util.regex.Matcher matcher = CODE.matcher(wanted);
    if (matcher.matches()) {
      Student direct = students.findByStudentYearAndStudentNumber(
          Integer.valueOf(matcher.group(1)), Integer.valueOf(matcher.group(2))).orElse(null);
      if (direct != null && StudentCodes.of(direct).equalsIgnoreCase(wanted)) return direct;
    }
    return students.findAll().stream()
        .filter(student -> StudentCodes.of(student).equalsIgnoreCase(wanted))
        .findFirst()
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O estudante não foi encontrado"));
  }

  public Student studentById(Long id) {
    return students.findById(id).orElseThrow(() -> new ResponseStatusException(
        HttpStatus.NOT_FOUND, "O estudante não foi encontrado"));
  }

  private MobileMoneyDtos.StudentPayables build(Student student) {
    String studentCode = StudentCodes.of(student);
    StudentEnrollment enrollment = enrollments
        .findFirstByStudentIdOrderByCreatedAtDescIdDesc(student.getId()).orElse(null);
    Predicate<String> mine = studentCode::equalsIgnoreCase;
    List<MobileMoneyDtos.PayableGroup> groups = new ArrayList<>();
    groups.add(group(MobileMoneyKind.INSCRICAO, java.util.stream.Stream.concat(
        fees.list("ENROLLMENT").stream(), fees.list("MANUAL").stream())
        .filter(charge -> mine.test(charge.studentCode()) && positive(charge.balance()))
        .map(charge -> item(charge.id(), charge.description(), charge.periodLabel(), charge.dueDate(),
            charge.balance(), MobileMoneyKind.INSCRICAO))
        .toList()));
    groups.add(group(MobileMoneyKind.MENSALIDADE, fees.list("MONTHLY").stream()
        .filter(charge -> mine.test(charge.studentCode()) && positive(charge.balance()))
        .map(charge -> item(charge.id(), charge.description(), charge.periodLabel(), charge.dueDate(),
            charge.balance(), MobileMoneyKind.MENSALIDADE))
        .toList()));
    groups.add(group(MobileMoneyKind.TESTE, tests.list(null).stream()
        .filter(row -> mine.test(row.studentCode()) && positive(row.balance()))
        .map(row -> item(row.id(), "Teste", row.testType(), row.registrationDate(), row.balance(),
            MobileMoneyKind.TESTE))
        .toList()));
    groups.add(group(MobileMoneyKind.EXAME, exams.list(null).stream()
        .filter(row -> mine.test(row.studentCode()) && positive(row.balance()))
        .map(row -> item(row.id(), "Exame", row.examType(), row.registrationDate(), row.balance(),
            MobileMoneyKind.EXAME))
        .toList()));
    groups.add(group(MobileMoneyKind.UNIFORME, uniforms.list().stream()
        .filter(row -> mine.test(row.studentCode()) && !row.paid() && positive(row.amount()))
        .map(row -> item(row.id(), "Uniforme", row.size() == null ? null : "Tamanho " + row.size(),
            row.orderDate(), row.amount(), MobileMoneyKind.UNIFORME))
        .toList()));
    groups.add(group(MobileMoneyKind.GRADUACAO, graduations.list().stream()
        .filter(row -> mine.test(row.studentCode()) && !row.paid() && positive(row.amount()))
        .map(row -> item(row.id(), "Graduação", row.guests() + " convidado(s)",
            row.registrationDate(), row.amount(), MobileMoneyKind.GRADUACAO))
        .toList()));
    groups.add(group(MobileMoneyKind.TRANCAMENTO, suspensions.list().stream()
        .filter(row -> mine.test(row.studentCode()) && !row.paid() && positive(row.amount()))
        .map(row -> item(row.id(), "Trancamento",
            row.durationMonths() == null ? null : row.durationMonths() + " mês(es)",
            row.suspensionDate(), row.amount(), MobileMoneyKind.TRANCAMENTO))
        .toList()));
    groups.add(group(MobileMoneyKind.PRESENCA, attendances.list().stream()
        .filter(row -> mine.test(row.studentCode()) && row.payment() == null
            && positive(row.justificationFee()))
        .map(row -> item(row.id(), "Justificação de falta", row.justification(), row.date(),
            row.justificationFee(), MobileMoneyKind.PRESENCA))
        .toList()));
    return new MobileMoneyDtos.StudentPayables(
        student.getId(),
        studentCode,
        java.util.stream.Stream.of(student.getFirstName(), student.getSurname())
            .filter(value -> value != null && !value.isBlank()).map(String::trim)
            .collect(java.util.stream.Collectors.joining(" ")),
        enrollment == null ? null : enrollment.getCourseName(),
        enrollment == null ? null : enrollment.getCategoryName(),
        enrollment == null ? null : enrollment.getLevelName(),
        enrollment == null ? null : enrollment.getModalityName(),
        firstFilled(student.getPhone(), student.getWhatsappNumber(), student.getSmsNumber()),
        groups);
  }

  private MobileMoneyDtos.PayableItem item(
      Long id, String description, String detail, LocalDate date, BigDecimal amount,
      MobileMoneyKind kind) {
    return new MobileMoneyDtos.PayableItem(
        id, description, detail, date, amount,
        transactions.existsByKindAndItemIdAndStatus(
            kind.name(), id, MobileMoneyTransaction.PENDING));
  }

  private MobileMoneyDtos.PayableGroup group(
      MobileMoneyKind kind, List<MobileMoneyDtos.PayableItem> items) {
    BigDecimal total = items.stream().map(MobileMoneyDtos.PayableItem::amount)
        .filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
    return new MobileMoneyDtos.PayableGroup(kind.name(), kind.label(), total, items);
  }

  private boolean positive(BigDecimal value) {
    return value != null && value.signum() > 0;
  }

  private String firstFilled(String... values) {
    for (String value : values) {
      if (value != null && !value.isBlank()) return value;
    }
    return null;
  }

}
