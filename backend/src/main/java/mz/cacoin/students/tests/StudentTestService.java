package mz.cacoin.students.tests;

import mz.cacoin.teacher.TeacherContext;
import mz.cacoin.common.StudentCodes;
import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import mz.cacoin.common.TextNormalizer;
import mz.cacoin.courses.Course;
import mz.cacoin.courses.CourseRepository;
import mz.cacoin.modules.Module;
import mz.cacoin.modules.ModuleRepository;
import mz.cacoin.modules.disciplines.Discipline;
import mz.cacoin.modules.disciplines.DisciplineRepository;
import mz.cacoin.students.Student;
import mz.cacoin.students.StudentEnrollment;
import mz.cacoin.students.StudentEnrollmentRepository;
import mz.cacoin.students.StudentRepository;
import mz.cacoin.tests.TestSettingsService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class StudentTestService {
  private static final BigDecimal STANDARD_MAX_GRADE = BigDecimal.valueOf(20);
  private static final Pattern GRADE_FORMAT = Pattern.compile("^\\d{1,2}([.]\\d{1,2})?$");
  private static final String UNIT_MODULE = "MODULE";
  private static final String UNIT_DISCIPLINE = "DISCIPLINE";

  private final StudentTestRepository tests;
  private final StudentTestGradeRepository grades;
  private final CourseRepository courses;
  private final ModuleRepository modules;
  private final DisciplineRepository disciplines;
  private final StudentRepository students;
  private final StudentEnrollmentRepository enrollments;
  private final TestSettingsService testSettings;

  @Transactional(readOnly = true)
  public List<StudentTestResponse> list() {
    return tests.findAllDetailed().stream().map(this::toResponse).toList();
  }

  @Transactional
  public StudentTestResponse create(StudentTestRequest request) {
    if (request == null) {
      throw badRequest("Dados do teste inválidos");
    }
    TeacherContext.requireCourse(request.courseId());
    Course course = findActiveCourse(request.courseId());
    Module module = null;
    Discipline discipline = null;
    if (request.moduleId() != null && request.disciplineId() != null) {
      throw badRequest("Selecione apenas um módulo ou uma disciplina");
    }
    if (request.moduleId() != null) {
      module = findModule(course, request.moduleId());
    } else if (request.disciplineId() != null) {
      discipline = findDiscipline(course, request.disciplineId());
    } else {
      throw badRequest("Selecione um módulo ou uma disciplina");
    }
    String name = validateName(request.name());
    BigDecimal maxGrade = validateMaxGrade(request.maxGrade());
    ensureUniqueName(module, discipline, name, null);

    StudentTest test = new StudentTest();
    test.setCourse(course);
    test.setModule(module);
    test.setDiscipline(discipline);
    test.setName(name);
    test.setMaxGrade(maxGrade);
    return toResponse(tests.save(test));
  }

  @Transactional
  public StudentTestResponse update(Long id, StudentTestRequest request) {
    StudentTest test = findTest(id);
    if (request == null) {
      throw badRequest("Dados do teste inválidos");
    }
    boolean sameCourse = request.courseId() != null
        && test.getCourse().getId().equals(request.courseId());
    boolean sameModule = test.getModule() == null
        ? request.moduleId() == null
        : test.getModule().getId().equals(request.moduleId());
    boolean sameDiscipline = test.getDiscipline() == null
        ? request.disciplineId() == null
        : test.getDiscipline().getId().equals(request.disciplineId());
    if (!sameCourse || !sameModule || !sameDiscipline) {
      throw badRequest("O curso e o módulo ou disciplina do teste não podem ser alterados");
    }
    String name = validateName(request.name());
    BigDecimal maxGrade = validateMaxGrade(request.maxGrade());
    ensureUniqueName(test.getModule(), test.getDiscipline(), name, id);
    BigDecimal highestGrade = grades.findHighestGradeByTestId(id);
    if (highestGrade != null && highestGrade.compareTo(maxGrade) > 0) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Já existem notas superiores à nota máxima indicada");
    }
    test.setName(name);
    test.setMaxGrade(maxGrade);
    return toResponse(tests.save(test));
  }

  @Transactional
  public StudentTestResponse setCompleted(Long id, StudentTestStatusRequest request) {
    if (request == null || request.completed() == null) {
      throw badRequest("O estado do teste é obrigatório");
    }
    StudentTest test = findTest(id);
    test.setCompleted(request.completed());
    return toResponse(tests.save(test));
  }

  @Transactional
  public void delete(Long id) {
    StudentTest test = findTest(id);
    grades.deleteAllByTestId(id);
    tests.delete(test);
  }

  @Transactional(readOnly = true)
  public List<StudentTestGradeResponse> listGrades(Long testId) {
    findTest(testId);
    return grades.findAllByTestId(testId).stream().map(this::toGradeResponse).toList();
  }

  @Transactional
  public StudentTestGradeResponse addGrade(Long testId, StudentTestGradeRequest request) {
    testSettings.requireGradeReleasePeriodOpen();
    StudentTest test = findOpenTest(testId);
    if (request == null || request.studentId() == null) {
      throw badRequest("Selecione um estudante");
    }
    Student student = students.findById(request.studentId())
        .orElseThrow(() -> badRequest("O estudante selecionado não foi encontrado"));
    ensureEnrolledInCourse(student, test.getCourse());
    if (grades.existsByTestIdAndStudentId(testId, student.getId())) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Esse estudante já tem nota neste teste");
    }
    StudentTestGrade grade = new StudentTestGrade();
    grade.setTest(test);
    grade.setStudent(student);
    applyGrade(grade, request, test.getMaxGrade());
    return toGradeResponse(grades.save(grade));
  }

  @Transactional
  public StudentTestGradeResponse updateGrade(
      Long testId, Long gradeId, StudentTestGradeRequest request) {
    testSettings.requireGradeReleasePeriodOpen();
    StudentTest test = findOpenTest(testId);
    StudentTestGrade grade = findGrade(testId, gradeId);
    if (request == null || request.studentId() == null
        || !grade.getStudent().getId().equals(request.studentId())) {
      throw badRequest("O estudante da nota não pode ser alterado");
    }
    applyGrade(grade, request, test.getMaxGrade());
    return toGradeResponse(grades.save(grade));
  }

  @Transactional
  public void deleteGrade(Long testId, Long gradeId) {
    testSettings.requireGradeReleasePeriodOpen();
    findOpenTest(testId);
    grades.delete(findGrade(testId, gradeId));
  }

  private void applyGrade(
      StudentTestGrade grade, StudentTestGradeRequest request, BigDecimal maxGrade) {
    String rawGrade = request.grade() == null ? "" : request.grade().trim();
    if (rawGrade.isEmpty()) {
      throw badRequest("Indique a nota ou \"-\"");
    }
    if (rawGrade.equals("-")) {
      grade.setAbsent(true);
      grade.setGrade(null);
    } else {
      grade.setAbsent(false);
      grade.setGrade(parseGrade(rawGrade, maxGrade));
    }
    String observations = request.observations() == null ? "" : request.observations().trim();
    grade.setObservations(observations.isEmpty() ? null : observations);
  }

  private BigDecimal parseGrade(String rawGrade, BigDecimal maxGrade) {
    String normalized = rawGrade.replace(',', '.');
    if (!GRADE_FORMAT.matcher(normalized).matches()) {
      throw badRequest("A nota deve ser um número ou \"-\", com no máximo duas casas decimais");
    }
    BigDecimal value = new BigDecimal(normalized);
    if (value.compareTo(maxGrade) > 0) {
      throw badRequest("A nota não pode ser superior a " + plain(maxGrade));
    }
    return value.setScale(2, java.math.RoundingMode.UNNECESSARY);
  }

  private BigDecimal validateMaxGrade(BigDecimal maxGrade) {
    if (maxGrade == null || maxGrade.signum() <= 0
        || maxGrade.compareTo(STANDARD_MAX_GRADE) > 0
        || maxGrade.stripTrailingZeros().scale() > 2) {
      throw badRequest(
          "A nota máxima deve ser maior que 0 e não superior a 20, com no máximo duas casas decimais");
    }
    return maxGrade.setScale(2, java.math.RoundingMode.UNNECESSARY);
  }

  private String validateName(String value) {
    if (value == null) {
      throw badRequest("Indique o nome do teste");
    }
    String name = TextNormalizer.normalize(value).trim();
    if (name.isEmpty() || name.length() > 150) {
      throw badRequest("O nome do teste deve ter entre 1 e 150 caracteres");
    }
    return name;
  }

  private void ensureUniqueName(Module module, Discipline discipline, String name, Long excludedId) {
    boolean duplicate;
    if (module != null) {
      duplicate = excludedId == null
          ? tests.existsByModuleIdAndNameIgnoreCase(module.getId(), name)
          : tests.existsByModuleIdAndNameIgnoreCaseAndIdNot(module.getId(), name, excludedId);
    } else {
      duplicate = excludedId == null
          ? tests.existsByDisciplineIdAndNameIgnoreCase(discipline.getId(), name)
          : tests.existsByDisciplineIdAndNameIgnoreCaseAndIdNot(
              discipline.getId(), name, excludedId);
    }
    if (duplicate) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Já existe um teste com esse nome para o módulo ou disciplina selecionado");
    }
  }

  private void ensureEnrolledInCourse(Student student, Course course) {
    Long enrolledCourseId = enrollments
        .findFirstByStudentIdOrderByCreatedAtDescIdDesc(student.getId())
        .map(StudentEnrollment::getCourse)
        .map(Course::getId)
        .orElse(null);
    if (!course.getId().equals(enrolledCourseId)) {
      throw badRequest("O estudante não está inscrito no curso deste teste");
    }
  }

  private Course findActiveCourse(Long id) {
    if (id == null) {
      throw badRequest("Selecione um curso");
    }
    Course course = courses.findById(id)
        .orElseThrow(() -> badRequest("O curso selecionado não foi encontrado"));
    if (!course.isActive()) {
      throw badRequest("O curso selecionado não está ativo");
    }
    return course;
  }

  private Module findModule(Course course, Long id) {
    Module module = modules.findById(id)
        .orElseThrow(() -> badRequest("O módulo selecionado não foi encontrado"));
    if (!module.getCourse().getId().equals(course.getId())) {
      throw badRequest("O módulo selecionado não pertence ao curso");
    }
    if (!module.isActive()) {
      throw badRequest("O módulo selecionado não está ativo");
    }
    return module;
  }

  private Discipline findDiscipline(Course course, Long id) {
    Discipline discipline = disciplines.findById(id)
        .orElseThrow(() -> badRequest("A disciplina selecionada não foi encontrada"));
    if (!discipline.getCourse().getId().equals(course.getId())) {
      throw badRequest("A disciplina selecionada não pertence ao curso");
    }
    if (!discipline.isActive()) {
      throw badRequest("A disciplina selecionada não está ativa");
    }
    return discipline;
  }

  private StudentTest findTest(Long id) {
    return tests.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O teste não foi encontrado"));
  }

  private StudentTest findOpenTest(Long id) {
    StudentTest test = findTest(id);
    if (test.isCompleted()) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "O teste está concluído; reabra-o para alterar as notas");
    }
    return test;
  }

  private StudentTestGrade findGrade(Long testId, Long gradeId) {
    StudentTestGrade grade = grades.findById(gradeId)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "A nota não foi encontrada"));
    if (!grade.getTest().getId().equals(testId)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "A nota não foi encontrada");
    }
    return grade;
  }

  private StudentTestResponse toResponse(StudentTest test) {
    Course course = test.getCourse();
    Module module = test.getModule();
    Discipline discipline = test.getDiscipline();
    boolean isModule = module != null;
    return new StudentTestResponse(
        test.getId(),
        course.getId(),
        TextNormalizer.toDisplay(course.getName()),
        TextNormalizer.toDisplay(course.getCategory().getName()),
        TextNormalizer.toDisplay(course.getLevel().getName()),
        TextNormalizer.toDisplay(course.getModality().getName()),
        isModule ? UNIT_MODULE : UNIT_DISCIPLINE,
        isModule ? module.getId() : discipline.getId(),
        isModule ? module.getModuleNumber() : discipline.getDisciplineNumber(),
        TextNormalizer.toDisplay(isModule ? module.getName() : discipline.getName()),
        TextNormalizer.toDisplay(test.getName()),
        test.getMaxGrade(),
        test.isCompleted());
  }

  private StudentTestGradeResponse toGradeResponse(StudentTestGrade grade) {
    Student student = grade.getStudent();
    return new StudentTestGradeResponse(
        grade.getId(),
        grade.getTest().getId(),
        student.getId(),
        StudentCodes.of(student),
        Stream.of(student.getFirstName(), student.getSurname())
            .filter(part -> part != null && !part.isBlank())
            .map(String::trim)
            .collect(java.util.stream.Collectors.joining(" ")),
        grade.getGrade(),
        grade.isAbsent(),
        grade.getObservations());
  }

  private String plain(BigDecimal value) {
    return value.stripTrailingZeros().toPlainString();
  }

  private ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
