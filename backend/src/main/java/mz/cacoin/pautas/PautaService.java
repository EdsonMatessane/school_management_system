package mz.cacoin.pautas;

import mz.cacoin.teacher.TeacherContext;
import mz.cacoin.settings.SystemDate;
import mz.cacoin.common.StudentCodes;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import mz.cacoin.assessments.AssessmentComponents;
import mz.cacoin.assessments.AssessmentGrade;
import mz.cacoin.assessments.AssessmentGradeRepository;
import mz.cacoin.courses.Course;
import mz.cacoin.students.Student;
import mz.cacoin.students.StudentEnrollmentRepository;
import mz.cacoin.students.StudentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class PautaService {
  private final PautaEntryRepository entries;
  private final AssessmentGradeRepository grades;
  private final StudentRepository students;
  private final StudentEnrollmentRepository enrollments;
  private final PautaSettingsService pautaSettings;

  @Transactional(readOnly = true)
  public List<PautaResponse> list(Integer year, Long courseId) {
    return entries.findAllByOrderByAcademicYearDescIdDesc().stream()
        .filter(entry -> year == null || entry.getAcademicYear() == year)
        .filter(entry -> courseId == null || entry.getCourse().getId().equals(courseId))
        .map(this::toResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<Integer> years() {
    List<Integer> years = new ArrayList<>(entries.findYears());
    int current = SystemDate.year();
    if (!years.contains(current)) {
      years.add(0, current);
    }
    return years;
  }

  @Transactional(readOnly = true)
  public PautaResponse preview(Long studentId, Integer year) {
    Student student = findStudent(studentId);
    Course course = currentCourse(student);
    return toResponse(null, student, course, year == null ? SystemDate.year() : year);
  }

  @Transactional
  public PautaResponse create(PautaRequest request) {
    if (request == null || request.studentId() == null) {
      throw badRequest("Indique o estudante");
    }
    pautaSettings.requireLaunchPeriodOpen();
    int year = request.year() == null ? SystemDate.year() : request.year();
    Student student = findStudent(request.studentId());
    if (!student.isActive()) {
      throw badRequest("O estudante selecionado está inativo");
    }
    if (entries.existsByStudentIdAndAcademicYear(student.getId(), year)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "O estudante já tem pauta lançada para " + year);
    }
    Course course = currentCourse(student);
    TeacherContext.requireCourse(course.getId());
    PautaEntry entry = new PautaEntry();
    entry.setStudent(student);
    entry.setCourse(course);
    entry.setAcademicYear(year);
    fill(entry, requireComplete(student, year));
    return toResponse(entries.save(entry));
  }

  @Transactional
  public PautaResponse refresh(Long id) {
    pautaSettings.requireLaunchPeriodOpen();
    PautaEntry entry = find(id);
    fill(entry, requireComplete(entry.getStudent(), entry.getAcademicYear()));
    return toResponse(entries.save(entry));
  }

  @Transactional
  public void delete(Long id) {
    pautaSettings.requireLaunchPeriodOpen();
    entries.delete(find(id));
  }

  private Map<String, BigDecimal> requireComplete(Student student, int year) {
    Map<String, BigDecimal> values = collect(student.getId(), year);
    List<String> missing = AssessmentComponents.CODES.stream()
        .filter(code -> !values.containsKey(code))
        .map(AssessmentComponents::label)
        .toList();
    if (!missing.isEmpty()) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Notas incompletas: falta " + String.join(", ", missing));
    }
    return values;
  }

  private Map<String, BigDecimal> collect(Long studentId, int year) {
    Map<String, BigDecimal> values = new HashMap<>();
    for (AssessmentGrade grade : grades.findAllBySheetAcademicYearAndStudentId(year, studentId)) {
      values.put(
          grade.getComponent(),
          grade.isAbsent() || grade.getGrade() == null ? BigDecimal.ZERO : grade.getGrade());
    }
    return values;
  }

  private void fill(PautaEntry entry, Map<String, BigDecimal> values) {
    List<BigDecimal> tests = AssessmentComponents.TESTS.stream().map(values::get).toList();
    entry.setT1(tests.get(0));
    entry.setT2(tests.get(1));
    entry.setT3(tests.get(2));
    entry.setT4(tests.get(3));
    entry.setT5(tests.get(4));
    entry.setT6(tests.get(5));
    int frequency = PautaRules.frequency(tests);
    entry.setFrequency(frequency);
    entry.setExam1(values.get("E1"));
    entry.setExam2(values.get("E2"));
    entry.setWork(values.get("TR"));
    int average = PautaRules.finalAverage(frequency, entry.getExam1(), entry.getExam2(), entry.getWork());
    entry.setFinalAverage(average);
    entry.setResult(PautaRules.result(average));
  }

  private PautaEntry find(Long id) {
    return entries.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "A pauta não foi encontrada"));
  }

  private Student findStudent(Long id) {
    if (id == null) {
      throw badRequest("Indique o estudante");
    }
    return students.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O estudante não foi encontrado"));
  }

  private Course currentCourse(Student student) {
    return enrollments.findFirstByStudentIdOrderByCreatedAtDescIdDesc(student.getId())
        .map(enrollment -> enrollment.getCourse())
        .orElseThrow(() -> badRequest("O estudante não tem matrícula num curso"));
  }

  private PautaResponse toResponse(PautaEntry entry) {
    return build(entry.getId(), entry.getStudent(), entry.getCourse(), entry.getAcademicYear(),
        List.of(entry.getT1(), entry.getT2(), entry.getT3(), entry.getT4(), entry.getT5(),
            entry.getT6()),
        entry.getFrequency(), entry.getExam1(), entry.getExam2(), entry.getWork(),
        entry.getFinalAverage(), entry.getResult(), true, List.of());
  }

  private PautaResponse toResponse(Long id, Student student, Course course, int year) {
    Map<String, BigDecimal> values = collect(student.getId(), year);
    List<String> missing = AssessmentComponents.CODES.stream()
        .filter(code -> !values.containsKey(code))
        .map(AssessmentComponents::label)
        .toList();
    List<BigDecimal> tests = AssessmentComponents.TESTS.stream()
        .map(code -> values.get(code)).toList();
    if (!missing.isEmpty()) {
      return build(id, student, course, year, tests, null, values.get("E1"), values.get("E2"),
          values.get("TR"), null, null, false, missing);
    }
    int frequency = PautaRules.frequency(tests);
    int average = PautaRules.finalAverage(
        frequency, values.get("E1"), values.get("E2"), values.get("TR"));
    return build(id, student, course, year, tests, frequency, values.get("E1"), values.get("E2"),
        values.get("TR"), average, PautaRules.result(average), true, List.of());
  }

  private PautaResponse build(
      Long id, Student student, Course course, int year, List<BigDecimal> tests,
      Integer frequency, BigDecimal exam1, BigDecimal exam2, BigDecimal work,
      Integer finalAverage, String result, boolean complete, List<String> missing) {
    String name = Stream.of(student.getFirstName(), student.getSurname())
        .filter(value -> value != null && !value.isBlank())
        .collect(Collectors.joining(" "));
    return new PautaResponse(
        id,
        student.getId(),
        StudentCodes.of(student),
        name,
        student.getBiNumber(),
        student.getPhone(),
        course.getId(),
        course.getName(),
        course.getCategory().getId(),
        course.getCategory().getName(),
        course.getLevel().getId(),
        course.getLevel().getName(),
        course.getModality().getId(),
        course.getModality().getName(),
        year,
        tests.get(0), tests.get(1), tests.get(2), tests.get(3), tests.get(4), tests.get(5),
        frequency,
        exam1,
        exam2,
        work,
        finalAverage,
        result,
        complete,
        missing);
  }

  private ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
