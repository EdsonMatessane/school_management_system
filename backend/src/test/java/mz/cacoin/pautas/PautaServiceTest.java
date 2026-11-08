package mz.cacoin.pautas;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import mz.cacoin.assessments.AssessmentGrade;
import mz.cacoin.assessments.AssessmentGradeRepository;
import mz.cacoin.courses.Course;
import mz.cacoin.courses.categories.Category;
import mz.cacoin.courses.levels.Level;
import mz.cacoin.courses.modalities.Modality;
import mz.cacoin.students.Student;
import mz.cacoin.students.StudentEnrollment;
import mz.cacoin.students.StudentEnrollmentRepository;
import mz.cacoin.students.StudentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class PautaServiceTest {
  private PautaEntryRepository entries;
  private AssessmentGradeRepository grades;
  private StudentRepository students;
  private StudentEnrollmentRepository enrollments;
  private PautaSettingsService pautaSettings;
  private PautaService service;
  private Student student;
  private Course course;
  private final int year = Year.now().getValue();

  @BeforeEach
  void setUp() {
    entries = mock(PautaEntryRepository.class);
    grades = mock(AssessmentGradeRepository.class);
    students = mock(StudentRepository.class);
    enrollments = mock(StudentEnrollmentRepository.class);
    pautaSettings = mock(PautaSettingsService.class);
    service = new PautaService(entries, grades, students, enrollments, pautaSettings);

    student = new Student();
    student.setId(7L);
    student.setStudentYear(2026);
    student.setStudentNumber(7);
    student.setFirstName("Ana");
    student.setSurname("Matsinhe");
    student.setBiNumber("110100123456B");
    student.setPhone("841234567");
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
    when(students.findById(7L)).thenReturn(Optional.of(student));
    StudentEnrollment enrollment = new StudentEnrollment();
    enrollment.setStudent(student);
    enrollment.setCourse(course);
    when(enrollments.findFirstByStudentIdOrderByCreatedAtDescIdDesc(7L))
        .thenReturn(Optional.of(enrollment));
    when(entries.save(any(PautaEntry.class))).thenAnswer(invocation -> invocation.getArgument(0));
  }

  private List<AssessmentGrade> allGrades(String test, String exam1, String exam2, String work) {
    List<AssessmentGrade> list = new ArrayList<>();
    for (String code : List.of("T1", "T2", "T3", "T4", "T5", "T6")) {
      list.add(grade(code, test));
    }
    list.add(grade("E1", exam1));
    list.add(grade("E2", exam2));
    list.add(grade("TR", work));
    return list;
  }

  private AssessmentGrade grade(String component, String value) {
    AssessmentGrade grade = new AssessmentGrade();
    grade.setComponent(component);
    grade.setStudent(student);
    if (value == null) {
      grade.setAbsent(true);
    } else {
      grade.setGrade(new BigDecimal(value));
    }
    return grade;
  }

  @Test
  void createStoresTheComputedFrequencyAverageAndResult() {
    when(grades.findAllBySheetAcademicYearAndStudentId(year, 7L))
        .thenReturn(allGrades("10", "8", "9", "11"));

    PautaResponse response = service.create(new PautaRequest(7L, null));

    assertEquals(10, response.frequency());
    assertEquals(10, response.finalAverage());
    assertEquals("APPROVED", response.result());
    assertEquals("CACOIN202607", response.studentCode());
    assertEquals("110100123456B", response.biNumber());
    verify(pautaSettings).requireLaunchPeriodOpen();
  }

  @Test
  void absentComponentsCountAsZero() {
    when(grades.findAllBySheetAcademicYearAndStudentId(year, 7L))
        .thenReturn(allGrades("10", null, null, null));

    PautaResponse response = service.create(new PautaRequest(7L, null));

    assertEquals(0, response.exam1().signum());
    assertEquals(3, response.finalAverage());
    assertEquals("REJECTED", response.result());
  }

  @Test
  void createRejectsIncompleteGradesListingWhatIsMissing() {
    List<AssessmentGrade> partial = allGrades("10", "8", "9", "11");
    partial.removeIf(item -> item.getComponent().equals("E2") || item.getComponent().equals("T3"));
    when(grades.findAllBySheetAcademicYearAndStudentId(year, 7L)).thenReturn(partial);

    ResponseStatusException exception = assertThrows(
        ResponseStatusException.class, () -> service.create(new PautaRequest(7L, null)));

    assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
    assertTrue(exception.getReason().contains("T3"));
    assertTrue(exception.getReason().contains("Exame2"));
    verify(entries, never()).save(any(PautaEntry.class));
  }

  @Test
  void createRejectsDuplicatesAndClosedPeriod() {
    when(grades.findAllBySheetAcademicYearAndStudentId(year, 7L))
        .thenReturn(allGrades("10", "8", "9", "11"));
    when(entries.existsByStudentIdAndAcademicYear(7L, year)).thenReturn(true);
    assertEquals(409, assertThrows(ResponseStatusException.class,
        () -> service.create(new PautaRequest(7L, null))).getStatusCode().value());

    doThrow(new ResponseStatusException(HttpStatus.CONFLICT, "fechado"))
        .when(pautaSettings).requireLaunchPeriodOpen();
    assertEquals(409, assertThrows(ResponseStatusException.class,
        () -> service.create(new PautaRequest(7L, null))).getStatusCode().value());
    verify(entries, never()).save(any(PautaEntry.class));
  }

  @Test
  void previewReportsIncompleteGradesWithoutResult() {
    List<AssessmentGrade> partial = allGrades("10", "8", "9", "11");
    partial.removeIf(item -> item.getComponent().equals("TR"));
    when(grades.findAllBySheetAcademicYearAndStudentId(year, 7L)).thenReturn(partial);

    PautaResponse preview = service.preview(7L, null);

    assertFalse(preview.complete());
    assertEquals(List.of("Trabalho"), preview.missing());
    assertEquals(null, preview.result());
    assertEquals(10, preview.t1().intValue());
  }

  @Test
  void previewOfACompleteStudentReturnsTheResultWithoutSaving() {
    when(grades.findAllBySheetAcademicYearAndStudentId(year, 7L))
        .thenReturn(allGrades("12.5", "10", "10", "10"));

    PautaResponse preview = service.preview(7L, null);

    assertTrue(preview.complete());
    assertEquals(13, preview.frequency());
    assertEquals(11, preview.finalAverage());
    assertEquals("APPROVED", preview.result());
    verify(entries, never()).save(any(PautaEntry.class));
  }
}
