package mz.cacoin.assessments;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Year;
import java.util.List;
import java.util.Optional;
import mz.cacoin.courses.Course;
import mz.cacoin.courses.CourseRepository;
import mz.cacoin.courses.categories.Category;
import mz.cacoin.courses.levels.Level;
import mz.cacoin.courses.modalities.Modality;
import mz.cacoin.staff.StaffCourseAssignment;
import mz.cacoin.staff.StaffMember;
import mz.cacoin.students.Student;
import mz.cacoin.students.StudentEnrollment;
import mz.cacoin.students.StudentEnrollmentRepository;
import mz.cacoin.students.StudentRepository;
import mz.cacoin.tests.TestSettingsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class AssessmentServiceTest {
  private AssessmentSheetRepository sheets;
  private AssessmentSheetTeacherRepository sheetTeachers;
  private AssessmentGradeRepository grades;
  private AssessmentTeacherAssignmentRepository teacherAssignments;
  private StudentEnrollmentRepository enrollments;
  private CourseRepository courses;
  private TestSettingsService testSettings;
  private AssessmentService service;
  private Student student;
  private Course course;
  private StaffMember teacher;
  private AssessmentSheet sheet;

  @BeforeEach
  void setUp() {
    sheets = mock(AssessmentSheetRepository.class);
    sheetTeachers = mock(AssessmentSheetTeacherRepository.class);
    grades = mock(AssessmentGradeRepository.class);
    teacherAssignments = mock(AssessmentTeacherAssignmentRepository.class);
    enrollments = mock(StudentEnrollmentRepository.class);
    courses = mock(CourseRepository.class);
    testSettings = mock(TestSettingsService.class);
    service = new AssessmentService(
        sheets, sheetTeachers, mock(AssessmentSheetStudentRepository.class), grades,
        teacherAssignments, mock(StudentRepository.class), enrollments, courses, testSettings);

    student = new Student();
    student.setId(7L);
    student.setStudentYear(2026);
    student.setStudentNumber(7);
    student.setFirstName("Ana");
    student.setSurname("Matsinhe");
    course = new Course();
    course.setId(3L);
    course.setName("Informática");
    Category category = new Category();
    category.setId(1L);
    category.setName("Tecnologia");
    Level level = new Level();
    level.setId(1L);
    level.setName("Básico");
    Modality modality = new Modality();
    modality.setId(1L);
    modality.setName("Presencial");
    course.setCategory(category);
    course.setLevel(level);
    course.setModality(modality);
    teacher = new StaffMember();
    teacher.setId(5L);
    teacher.setStaffType("teachers");
    teacher.setActive(true);
    teacher.setFirstName("Carlos");
    teacher.setSurname("Mondlane");
    sheet = new AssessmentSheet();
    sheet.setId(1L);
    sheet.setCourse(course);
    sheet.setAcademicYear(Year.now().getValue());

    StudentEnrollment enrollment = new StudentEnrollment();
    enrollment.setStudent(student);
    enrollment.setCourse(course);
    when(enrollments.findAllByOrderByCreatedAtDescIdDesc()).thenReturn(List.of(enrollment));
    when(courses.findById(3L)).thenReturn(Optional.of(course));
    when(sheets.findById(1L)).thenReturn(Optional.of(sheet));
    when(sheets.save(any(AssessmentSheet.class))).thenAnswer(invocation -> invocation.getArgument(0));
    when(sheetTeachers.save(any(AssessmentSheetTeacher.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    when(grades.save(any(AssessmentGrade.class))).thenAnswer(invocation -> invocation.getArgument(0));
    StaffCourseAssignment assignment = new StaffCourseAssignment();
    assignment.setStaffMember(teacher);
    when(teacherAssignments.findAllByCourseIdAndActiveTrue(3L)).thenReturn(List.of(assignment));
  }

  @Test
  void newRecordCopiesTheAssignedTeachersAndStartsPendingWithNineComponents() {
    AssessmentSheetResponse response = service.create(new AssessmentSheetRequest(3L));

    assertEquals(Year.now().getValue(), response.academicYear());
    assertEquals("Carlos Mondlane", response.teachers().get(0).name());
    assertEquals(9, response.components().size());
    assertEquals(List.of("T1", "T2", "T3", "T4", "T5", "T6", "E1", "E2", "TR"),
        response.components().stream().map(AssessmentComponentProgress::code).toList());
    assertEquals("PENDING", response.status());
    assertEquals(1, response.students());
  }

  @Test
  void newRecordRejectsCoursesWithoutTeachersAndWhenNoNewStudentsExist() {
    when(sheets.findAllByCourseIdAndAcademicYearOrderByIdAsc(3L, Year.now().getValue()))
        .thenReturn(List.of(sheet));
    assertEquals(400, assertThrows(ResponseStatusException.class,
        () -> service.create(new AssessmentSheetRequest(3L))).getStatusCode().value());

    when(sheets.findAllByCourseIdAndAcademicYearOrderByIdAsc(3L, Year.now().getValue()))
        .thenReturn(List.of());
    when(teacherAssignments.findAllByCourseIdAndActiveTrue(3L)).thenReturn(List.of());
    assertEquals(400, assertThrows(ResponseStatusException.class,
        () -> service.create(new AssessmentSheetRequest(3L))).getStatusCode().value());
    verify(sheets, never()).save(any(AssessmentSheet.class));
  }

  @Test
  void gradesAcceptDecimalsWithCommaOrDotAndTheAbsentMark() {
    when(grades.findAllBySheetIdAndComponent(1L, "T1")).thenReturn(List.of());

    service.saveGrades(1L, "t1", new AssessmentGradesRequest(
        List.of(new AssessmentEntryRequest(7L, "2,75"))));
    org.mockito.ArgumentCaptor<AssessmentGrade> captor =
        org.mockito.ArgumentCaptor.forClass(AssessmentGrade.class);
    verify(grades).save(captor.capture());
    assertEquals(new BigDecimal("2.75"), captor.getValue().getGrade());
    assertEquals("T1", captor.getValue().getComponent());

    service.saveGrades(1L, "T1", new AssessmentGradesRequest(
        List.of(new AssessmentEntryRequest(7L, "-"))));
    verify(grades, org.mockito.Mockito.times(2)).save(captor.capture());
    assertTrue(captor.getValue().isAbsent());
    assertNull(captor.getValue().getGrade());
  }

  @Test
  void gradesRejectValuesAboveTwentyInvalidFormatsAndForeignStudents() {
    for (String invalid : List.of("20.5", "21", "1.234", "abc", "-1")) {
      assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.saveGrades(
          1L, "T1", new AssessmentGradesRequest(
              List.of(new AssessmentEntryRequest(7L, invalid))))).getStatusCode().value());
    }
    assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.saveGrades(
        1L, "T1", new AssessmentGradesRequest(
            List.of(new AssessmentEntryRequest(99L, "10"))))).getStatusCode().value());
    assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.saveGrades(
        1L, "T9", new AssessmentGradesRequest(List.of()))).getStatusCode().value());
    verify(grades, never()).save(any(AssessmentGrade.class));
  }

  @Test
  void savingGradesHonoursTheGradeReleasePeriod() {
    doThrow(new ResponseStatusException(HttpStatus.CONFLICT, "fechado"))
        .when(testSettings).requireGradeReleasePeriodOpen();

    assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.saveGrades(
        1L, "T1", new AssessmentGradesRequest(
            List.of(new AssessmentEntryRequest(7L, "10"))))).getStatusCode().value());
    verify(grades, never()).save(any(AssessmentGrade.class));
  }

  @Test
  void blankGradeClearsAnExistingOne() {
    AssessmentGrade existing = new AssessmentGrade();
    existing.setStudent(student);
    existing.setComponent("T1");
    existing.setGrade(new BigDecimal("8.00"));
    when(grades.findAllBySheetIdAndComponent(1L, "T1")).thenReturn(List.of(existing));

    service.saveGrades(1L, "T1", new AssessmentGradesRequest(
        List.of(new AssessmentEntryRequest(7L, " "))));

    verify(grades).delete(existing);
  }

  @Test
  void gradesTableShowsEveryComponentPerStudentWithTheTeachers() {
    when(sheets.findAllByCourseIdAndAcademicYearOrderByIdAsc(3L, Year.now().getValue()))
        .thenReturn(List.of(sheet));
    AssessmentSheetTeacher link = new AssessmentSheetTeacher();
    link.setSheet(sheet);
    link.setTeacher(teacher);
    when(sheetTeachers.findAllBySheetIdIn(List.of(1L))).thenReturn(List.of(link));
    AssessmentGrade t1 = new AssessmentGrade();
    t1.setSheet(sheet);
    t1.setStudent(student);
    t1.setComponent("T1");
    t1.setGrade(new BigDecimal("12.50"));
    AssessmentGrade e1 = new AssessmentGrade();
    e1.setSheet(sheet);
    e1.setStudent(student);
    e1.setComponent("E1");
    e1.setAbsent(true);
    when(grades.findAllBySheetIdIn(List.of(1L))).thenReturn(List.of(t1, e1));

    List<AssessmentGradesRowResponse> rows = service.notas(3L, null);

    assertEquals(1, rows.size());
    assertEquals("CACOIN202607", rows.get(0).studentCode());
    assertEquals(new BigDecimal("12.50"), rows.get(0).grades().get("T1").value());
    assertTrue(rows.get(0).grades().get("E1").absent());
    assertNull(rows.get(0).grades().get("T2"));
    assertEquals("Carlos Mondlane", rows.get(0).teachers().get(0).name());
  }
}
