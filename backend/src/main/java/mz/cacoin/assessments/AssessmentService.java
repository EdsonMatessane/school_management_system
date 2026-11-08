package mz.cacoin.assessments;

import mz.cacoin.teacher.TeacherContext;
import mz.cacoin.settings.SystemDate;
import mz.cacoin.common.StudentCodes;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import mz.cacoin.courses.Course;
import mz.cacoin.courses.CourseRepository;
import mz.cacoin.staff.StaffCourseAssignment;
import mz.cacoin.staff.StaffMember;
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
public class AssessmentService {
  static final BigDecimal MAX_GRADE = BigDecimal.valueOf(20);
  private static final Pattern GRADE_FORMAT = Pattern.compile("^\\d{1,2}([.]\\d{1,2})?$");

  private final AssessmentSheetRepository sheets;
  private final AssessmentSheetTeacherRepository sheetTeachers;
  private final AssessmentSheetStudentRepository sheetStudents;
  private final AssessmentGradeRepository grades;
  private final AssessmentTeacherAssignmentRepository teacherAssignments;
  private final StudentRepository students;
  private final StudentEnrollmentRepository enrollments;
  private final CourseRepository courses;
  private final TestSettingsService testSettings;

  @Transactional(readOnly = true)
  public List<AssessmentSheetResponse> list(Long courseId, Integer year) {
    List<AssessmentSheet> found = sheets.findAllByOrderByAcademicYearDescIdDesc().stream()
        .filter(sheet -> courseId == null || sheet.getCourse().getId().equals(courseId))
        .filter(sheet -> year == null || sheet.getAcademicYear() == year)
        .toList();
    if (found.isEmpty()) {
      return List.of();
    }
    List<Long> ids = found.stream().map(AssessmentSheet::getId).toList();
    Map<Long, List<AssessmentSheetTeacher>> teachersBySheet = sheetTeachers.findAllBySheetIdIn(ids)
        .stream().collect(Collectors.groupingBy(item -> item.getSheet().getId()));
    Map<Long, List<AssessmentGrade>> gradesBySheet = grades.findAllBySheetIdIn(ids).stream()
        .collect(Collectors.groupingBy(item -> item.getSheet().getId()));
    Map<Long, List<Student>> studentsBySheet = studentsBySheet(found, false);
    Map<Long, Long> concluded = sheetStudents.findAllBySheetIdIn(ids).stream()
        .filter(item -> item.getCompletedAt() != null)
        .collect(Collectors.groupingBy(item -> item.getSheet().getId(), Collectors.counting()));
    return found.stream().map(sheet -> toResponse(
        sheet,
        teachersBySheet.getOrDefault(sheet.getId(), List.of()),
        gradesBySheet.getOrDefault(sheet.getId(), List.of()),
        studentsBySheet.get(sheet.getId()).stream().map(Student::getId)
            .collect(Collectors.toSet()),
        concluded.getOrDefault(sheet.getId(), 0L).intValue())).toList();
  }

  @Transactional
  public AssessmentSheetResponse create(AssessmentSheetRequest request) {
    if (request == null || request.courseId() == null) {
      throw badRequest("Indique o curso");
    }
    TeacherContext.requireCourse(request.courseId());
    Course course = courses.findById(request.courseId())
        .filter(Course::isActive)
        .orElseThrow(() -> badRequest("O curso selecionado não existe ou está inativo"));
    int year = SystemDate.year();
    List<StaffMember> teachers = courseTeachers(course.getId());
    if (teachers.isEmpty()) {
      throw badRequest("O curso não tem professores activos atribuídos");
    }
    List<AssessmentSheet> existing =
        sheets.findAllByCourseIdAndAcademicYearOrderByIdAsc(course.getId(), year);
    Map<Long, List<Student>> existingStudents = studentsBySheet(existing, true);
    Set<Long> withList = sheetStudents
        .findAllBySheetIdIn(existing.stream().map(AssessmentSheet::getId).toList()).stream()
        .map(item -> item.getSheet().getId()).collect(Collectors.toSet());
    Set<Long> taken = new java.util.HashSet<>();
    for (AssessmentSheet previous : existing) {
      for (Student student : existingStudents.get(previous.getId())) {
        taken.add(student.getId());
        if (!withList.contains(previous.getId())) {
          AssessmentSheetStudent member = new AssessmentSheetStudent();
          member.setSheet(previous);
          member.setStudent(student);
          sheetStudents.save(member);
        }
      }
    }
    List<Student> members = activeStudentsOfCourse(course.getId()).stream()
        .filter(student -> !taken.contains(student.getId()))
        .toList();
    if (members.isEmpty()) {
      throw badRequest("Não há estudantes novos neste curso para um novo registo");
    }
    AssessmentSheet sheet = new AssessmentSheet();
    sheet.setCourse(course);
    sheet.setAcademicYear(year);
    AssessmentSheet saved = sheets.save(sheet);
    List<AssessmentSheetTeacher> links = new ArrayList<>();
    for (StaffMember teacher : teachers) {
      AssessmentSheetTeacher link = new AssessmentSheetTeacher();
      link.setSheet(saved);
      link.setTeacher(teacher);
      links.add(sheetTeachers.save(link));
    }
    for (Student student : members) {
      AssessmentSheetStudent member = new AssessmentSheetStudent();
      member.setSheet(saved);
      member.setStudent(student);
      sheetStudents.save(member);
    }
    return toResponse(saved, links, List.of(),
        members.stream().map(Student::getId).collect(Collectors.toSet()), 0);
  }

  @Transactional(readOnly = true)
  public List<AssessmentTeacherResponse> teachers(Long courseId) {
    if (courseId == null) {
      return List.of();
    }
    return courseTeachers(courseId).stream().map(this::toTeacher).toList();
  }

  @Transactional(readOnly = true)
  public List<AssessmentEntryResponse> entries(Long sheetId, String componentCode) {
    AssessmentSheet sheet = findSheet(sheetId);
    String component = requireComponent(componentCode);
    Map<Long, AssessmentGrade> byStudent = grades.findAllBySheetIdAndComponent(sheetId, component)
        .stream().collect(Collectors.toMap(item -> item.getStudent().getId(), Function.identity()));
    return studentsOf(sheet).stream().map(student -> {
      AssessmentGrade grade = byStudent.get(student.getId());
      return new AssessmentEntryResponse(
          student.getId(),
          studentCode(student),
          fullName(student),
          grade == null ? null : grade.getGrade(),
          grade != null && grade.isAbsent(),
          grade != null);
    }).toList();
  }

  @Transactional
  public List<AssessmentEntryResponse> saveGrades(
      Long sheetId, String componentCode, AssessmentGradesRequest request) {
    testSettings.requireGradeReleasePeriodOpen();
    AssessmentSheet sheet = findSheet(sheetId);
    String component = requireComponent(componentCode);
    if (request == null || request.entries() == null) {
      throw badRequest("Indique as notas a guardar");
    }
    // O administrador ainda pode corrigir registos concluídos; o professor não.
    Map<Long, Student> allowed = studentsBySheet(List.of(sheet), !TeacherContext.active())
        .get(sheet.getId()).stream()
        .collect(Collectors.toMap(Student::getId, Function.identity()));
    Set<Long> concludedIds = sheetStudents.findAllBySheetIdIn(List.of(sheetId)).stream()
        .filter(item -> item.getCompletedAt() != null)
        .map(item -> item.getStudent().getId())
        .collect(Collectors.toSet());
    Map<Long, AssessmentGrade> existing = grades.findAllBySheetIdAndComponent(sheetId, component)
        .stream().collect(Collectors.toMap(item -> item.getStudent().getId(), Function.identity()));
    for (AssessmentEntryRequest entry : request.entries()) {
      if (entry != null && TeacherContext.active() && concludedIds.contains(entry.studentId())) {
        throw TeacherContext.forbidden("O registo deste estudante já foi concluído");
      }
      if (entry == null || entry.studentId() == null || !allowed.containsKey(entry.studentId())) {
        throw badRequest("O estudante não pertence a este curso");
      }
      String raw = entry.grade() == null ? "" : entry.grade().trim();
      AssessmentGrade current = existing.get(entry.studentId());
      if (raw.isEmpty()) {
        if (current != null) {
          grades.delete(current);
          existing.remove(entry.studentId());
        }
        continue;
      }
      AssessmentGrade target = current != null ? current : new AssessmentGrade();
      target.setSheet(sheet);
      target.setStudent(allowed.get(entry.studentId()));
      target.setComponent(component);
      if ("-".equals(raw)) {
        target.setAbsent(true);
        target.setGrade(null);
      } else {
        target.setAbsent(false);
        target.setGrade(parseGrade(raw));
      }
      existing.put(entry.studentId(), grades.save(target));
    }
    return entries(sheetId, component);
  }

  @Transactional(readOnly = true)
  public List<AssessmentGradesRowResponse> notas(Long courseId, Integer year) {
    return notas(courseId, year, null);
  }

  @Transactional(readOnly = true)
  public List<AssessmentGradesRowResponse> notas(Long courseId, Integer year, Long sheetId) {
    return notas(courseId, year, sheetId, null);
  }

  /** {@code completed}: nulo = todos, falso = só em curso (Notas), verdadeiro = só concluídos (Histórico). */
  @Transactional(readOnly = true)
  public List<AssessmentGradesRowResponse> notas(
      Long courseId, Integer year, Long sheetId, Boolean completed) {
    if (courseId == null) {
      return List.of();
    }
    int academicYear = year == null ? SystemDate.year() : year;
    List<AssessmentSheet> yearSheets = sheetId != null
        ? sheets.findById(sheetId)
            .filter(found -> found.getCourse().getId().equals(courseId))
            .map(found -> List.of(found)).orElse(List.of())
        : sheets.findAllByCourseIdAndAcademicYearOrderByIdAsc(courseId, academicYear);
    if (yearSheets.isEmpty()) {
      return List.of();
    }
    List<Long> sheetIds = yearSheets.stream().map(AssessmentSheet::getId).toList();
    Map<Long, List<AssessmentTeacherResponse>> teachersBySheet = sheetTeachers
        .findAllBySheetIdIn(sheetIds).stream().collect(Collectors.groupingBy(
            item -> item.getSheet().getId(),
            Collectors.mapping(item -> toTeacher(item.getTeacher()), Collectors.toList())));
    Map<Long, List<AssessmentGrade>> gradesBySheet = grades.findAllBySheetIdIn(sheetIds).stream()
        .collect(Collectors.groupingBy(item -> item.getSheet().getId()));
    Map<Long, Map<Long, AssessmentSheetStudent>> membership = new LinkedHashMap<>();
    sheetStudents.findAllBySheetIdIn(sheetIds).forEach(item -> membership
        .computeIfAbsent(item.getSheet().getId(), id -> new LinkedHashMap<>())
        .put(item.getStudent().getId(), item));
    Map<Long, List<Student>> studentsBySheet = studentsBySheet(yearSheets, true);
    List<AssessmentGradesRowResponse> rows = new ArrayList<>();
    for (AssessmentSheet yearSheet : yearSheets) {
      Map<Long, Map<String, AssessmentGrade>> byStudent = new LinkedHashMap<>();
      for (AssessmentGrade grade : gradesBySheet.getOrDefault(yearSheet.getId(), List.of())) {
        byStudent.computeIfAbsent(grade.getStudent().getId(), id -> new LinkedHashMap<>())
            .put(grade.getComponent(), grade);
      }
      List<AssessmentTeacherResponse> teachers =
          teachersBySheet.getOrDefault(yearSheet.getId(), List.of());
      Map<Long, AssessmentSheetStudent> members =
          membership.getOrDefault(yearSheet.getId(), Collections.emptyMap());
      for (Student student : studentsBySheet.get(yearSheet.getId())) {
        AssessmentSheetStudent member = members.get(student.getId());
        boolean done = member != null && member.getCompletedAt() != null;
        if (completed != null && completed != done) {
          continue;
        }
        Map<String, AssessmentGrade> own =
            byStudent.getOrDefault(student.getId(), Collections.emptyMap());
        Map<String, AssessmentCell> cells = new LinkedHashMap<>();
        for (String code : AssessmentComponents.CODES) {
          AssessmentGrade grade = own.get(code);
          cells.put(code, grade == null ? null : new AssessmentCell(grade.getGrade(), grade.isAbsent()));
        }
        rows.add(new AssessmentGradesRowResponse(
            student.getId(), yearSheet.getId(), studentCode(student), fullName(student), cells,
            teachers, done, !done || !TeacherContext.active(),
            (!done || !TeacherContext.active()) && withinDeleteWindow(member)));
      }
    }
    return rows;
  }

  /** Conclui o registo de um estudante: só com todas as avaliações feitas (nota ou ausência). */
  @Transactional
  public void complete(Long sheetId, Long studentId) {
    AssessmentSheet sheet = findSheet(sheetId);
    TeacherContext.requireCourse(sheet.getCourse().getId());
    AssessmentSheetStudent member = member(sheet, studentId);
    if (member.getCompletedAt() != null) {
      throw badRequest("O registo deste estudante já foi concluído");
    }
    Set<String> done = grades.findAllBySheetId(sheetId).stream()
        .filter(item -> item.getStudent().getId().equals(studentId))
        .map(AssessmentGrade::getComponent)
        .collect(Collectors.toSet());
    List<String> missing = AssessmentComponents.CODES.stream()
        .filter(code -> !done.contains(code))
        .map(AssessmentComponents::label)
        .toList();
    if (!missing.isEmpty()) {
      throw badRequest("Não pode concluir: faltam as avaliações " + String.join(", ", missing)
          + ". Indique a nota ou \"-\" (ausência) em todas.");
    }
    member.setCompletedAt(Instant.now());
    sheetStudents.save(member);
  }

  /** Apaga o registo de um estudante (e as suas notas). Professores só nas primeiras 24 horas. */
  @Transactional
  public void remove(Long sheetId, Long studentId) {
    AssessmentSheet sheet = findSheet(sheetId);
    TeacherContext.requireCourse(sheet.getCourse().getId());
    AssessmentSheetStudent member = member(sheet, studentId);
    if (member.getCompletedAt() != null && TeacherContext.active()) {
      throw TeacherContext.forbidden("Um registo concluído não pode ser apagado");
    }
    if (!withinDeleteWindow(member)) {
      throw TeacherContext.forbidden("O prazo de 24 horas para apagar este registo terminou");
    }
    grades.deleteAll(grades.findAllBySheetId(sheetId).stream()
        .filter(item -> item.getStudent().getId().equals(studentId))
        .toList());
    sheetStudents.delete(member);
    // Sem estudantes, o registo deixa de existir (e a aba desaparece).
    if (sheetStudents.findAllBySheetIdIn(List.of(sheetId)).isEmpty()) {
      grades.deleteAll(grades.findAllBySheetId(sheetId));
      sheetTeachers.deleteAll(sheetTeachers.findAllBySheetIdIn(List.of(sheetId)));
      sheets.delete(sheet);
    }
  }

  private boolean withinDeleteWindow(AssessmentSheetStudent member) {
    if (!TeacherContext.active()) {
      return true;
    }
    return member != null && member.getCreatedAt() != null
        && Duration.between(member.getCreatedAt(), Instant.now()).compareTo(Duration.ofHours(24)) <= 0;
  }

  /** Registos anteriores à lista própria ganham a lista quando se mexe num estudante. */
  private AssessmentSheetStudent member(AssessmentSheet sheet, Long studentId) {
    if (sheetStudents.findAllBySheetIdIn(List.of(sheet.getId())).isEmpty()) {
      for (Student student : activeStudentsOfCourse(sheet.getCourse().getId())) {
        AssessmentSheetStudent created = new AssessmentSheetStudent();
        created.setSheet(sheet);
        created.setStudent(student);
        sheetStudents.save(created);
      }
    }
    return sheetStudents.findBySheetIdAndStudentId(sheet.getId(), studentId)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O estudante não pertence a este registo"));
  }

  /** Estudantes de um registo ainda em curso (sem o registo concluído). */
  List<Student> studentsOf(AssessmentSheet sheet) {
    return studentsBySheet(List.of(sheet), false).get(sheet.getId());
  }

  private Map<Long, List<Student>> studentsBySheet(
      List<AssessmentSheet> list, boolean includeCompleted) {
    Map<Long, List<Student>> activeByCourse = new LinkedHashMap<>();
    Map<Long, Set<Long>> memberIds = new LinkedHashMap<>();
    Map<Long, Set<Long>> completedIds = new LinkedHashMap<>();
    sheetStudents.findAllBySheetIdIn(list.stream().map(AssessmentSheet::getId).toList())
        .forEach(item -> {
          Long sheetId = item.getSheet().getId();
          memberIds.computeIfAbsent(sheetId, id -> new java.util.HashSet<>())
              .add(item.getStudent().getId());
          if (item.getCompletedAt() != null) {
            completedIds.computeIfAbsent(sheetId, id -> new java.util.HashSet<>())
                .add(item.getStudent().getId());
          }
        });
    Map<Long, List<Student>> result = new LinkedHashMap<>();
    for (AssessmentSheet sheet : list) {
      List<Student> active = activeByCourse.computeIfAbsent(
          sheet.getCourse().getId(), this::activeStudentsOfCourse);
      Set<Long> ids = memberIds.get(sheet.getId());
      Set<Long> finished = completedIds.getOrDefault(sheet.getId(), Set.of());
      // Registo anterior à lista própria: usa os estudantes activos do curso.
      List<Student> members = ids == null
          ? active
          : active.stream().filter(student -> ids.contains(student.getId())).toList();
      result.put(sheet.getId(), includeCompleted
          ? members
          : members.stream().filter(student -> !finished.contains(student.getId())).toList());
    }
    return result;
  }

  List<Student> activeStudentsOfCourse(Long courseId) {
    Map<Long, StudentEnrollment> latest = new LinkedHashMap<>();
    for (StudentEnrollment enrollment : enrollments.findAllByOrderByCreatedAtDescIdDesc()) {
      latest.putIfAbsent(enrollment.getStudent().getId(), enrollment);
    }
    return latest.values().stream()
        .filter(enrollment -> enrollment.getCourse() != null
            && enrollment.getCourse().getId().equals(courseId))
        .map(StudentEnrollment::getStudent)
        .filter(Student::isActive)
        .sorted(Comparator.comparing(Student::getId))
        .toList();
  }

  private List<StaffMember> courseTeachers(Long courseId) {
    return teacherAssignments.findAllByCourseIdAndActiveTrue(courseId).stream()
        .map(StaffCourseAssignment::getStaffMember)
        .filter(member -> member.isActive() && "teachers".equals(member.getStaffType()))
        .sorted(Comparator.comparing(this::fullName, String.CASE_INSENSITIVE_ORDER))
        .toList();
  }

  private BigDecimal parseGrade(String raw) {
    String normalized = raw.replace(',', '.');
    if (!GRADE_FORMAT.matcher(normalized).matches()) {
      throw badRequest("Indique uma nota válida (por exemplo 12, 12.5 ou 12.75) ou \"-\"");
    }
    BigDecimal value = new BigDecimal(normalized);
    if (value.compareTo(MAX_GRADE) > 0) {
      throw badRequest("A nota não pode ser superior a 20");
    }
    return value.setScale(2, RoundingMode.UNNECESSARY);
  }

  private String requireComponent(String code) {
    String component = AssessmentComponents.normalize(code);
    if (component == null) {
      throw badRequest("A avaliação indicada é inválida");
    }
    return component;
  }

  private AssessmentSheet findSheet(Long id) {
    return sheets.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O registo de notas não foi encontrado"));
  }

  private AssessmentSheetResponse toResponse(
      AssessmentSheet sheet,
      List<AssessmentSheetTeacher> teachers,
      List<AssessmentGrade> sheetGrades,
      Set<Long> studentIds,
      int concluded) {
    Course course = sheet.getCourse();
    Map<String, Long> gradedByComponent = sheetGrades.stream()
        .filter(grade -> studentIds.contains(grade.getStudent().getId()))
        .collect(Collectors.groupingBy(AssessmentGrade::getComponent, Collectors.counting()));
    List<AssessmentComponentProgress> progress = AssessmentComponents.CODES.stream()
        .map(code -> new AssessmentComponentProgress(
            code,
            AssessmentComponents.label(code),
            gradedByComponent.getOrDefault(code, 0L).intValue(),
            studentIds.size()))
        .toList();
    boolean complete = studentIds.isEmpty()
        ? concluded > 0
        : progress.stream().allMatch(item -> item.graded() >= item.total());
    return new AssessmentSheetResponse(
        sheet.getId(),
        course.getId(),
        course.getName(),
        course.getCategory().getId(),
        course.getCategory().getName(),
        course.getLevel().getId(),
        course.getLevel().getName(),
        course.getModality().getId(),
        course.getModality().getName(),
        sheet.getAcademicYear(),
        teachers.stream().map(item -> toTeacher(item.getTeacher())).toList(),
        progress,
        studentIds.size(),
        complete ? "COMPLETE" : "PENDING");
  }

  private AssessmentTeacherResponse toTeacher(StaffMember member) {
    return new AssessmentTeacherResponse(member.getId(), fullName(member));
  }

  private String studentCode(Student student) {
    return StudentCodes.of(student);
  }

  private String fullName(Student student) {
    return Stream.of(student.getFirstName(), student.getSurname())
        .filter(value -> value != null && !value.isBlank())
        .collect(Collectors.joining(" "));
  }

  private String fullName(StaffMember member) {
    return Stream.of(member.getFirstName(), member.getSurname())
        .filter(value -> value != null && !value.isBlank())
        .collect(Collectors.joining(" "));
  }

  private ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
