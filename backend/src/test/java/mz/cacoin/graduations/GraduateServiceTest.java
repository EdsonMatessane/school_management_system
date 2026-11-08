package mz.cacoin.graduations;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import mz.cacoin.courses.Course;
import mz.cacoin.courses.CourseRepository;
import mz.cacoin.courses.categories.Category;
import mz.cacoin.courses.levels.Level;
import mz.cacoin.courses.modalities.Modality;
import mz.cacoin.students.Student;
import mz.cacoin.students.StudentEnrollment;
import mz.cacoin.students.StudentEnrollmentRepository;
import mz.cacoin.students.StudentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class GraduateServiceTest {
  private GraduateRepository graduates;
  private StudentRepository students;
  private StudentEnrollmentRepository enrollments;
  private CourseRepository courses;
  private GraduateService service;
  private Student student;
  private Course course;

  @BeforeEach
  void setUp() {
    graduates = mock(GraduateRepository.class);
    students = mock(StudentRepository.class);
    enrollments = mock(StudentEnrollmentRepository.class);
    courses = mock(CourseRepository.class);
    service = new GraduateService(graduates, students, enrollments, courses);

    student = new Student();
    student.setId(7L);
    student.setStudentYear(2026);
    student.setStudentNumber(7);
    student.setFirstName("Ana");
    student.setSurname("Matsinhe");
    course = newCourse();
    when(students.findById(7L)).thenReturn(Optional.of(student));
    when(courses.findById(3L)).thenReturn(Optional.of(course));
    when(graduates.save(any(Graduate.class))).thenAnswer(invocation -> invocation.getArgument(0));
    StudentEnrollment enrollment = new StudentEnrollment();
    enrollment.setStudent(student);
    enrollment.setCourse(course);
    when(enrollments.findFirstByStudentIdOrderByCreatedAtDescIdDesc(7L))
        .thenReturn(Optional.of(enrollment));
  }

  @Test
  void registeringWithoutCeremonyCreatesAFormedStudent() {
    GraduateResponse response = service.register(new GraduateRequest(7L, 3L));

    assertEquals("FORMED", response.status());
    assertEquals("CACOIN202607", response.studentCode());
    assertEquals(36, response.durationMonths());
  }

  @Test
  void registeringTwiceIsRejected() {
    when(graduates.existsByStudentId(7L)).thenReturn(true);

    assertEquals(409, assertThrows(ResponseStatusException.class,
        () -> service.register(new GraduateRequest(7L, 3L))).getStatusCode().value());
    verify(graduates, never()).save(any(Graduate.class));
  }

  @Test
  void registeringRejectsAStudentNotEnrolledInTheCourse() {
    Course other = newCourse();
    other.setId(99L);
    when(courses.findById(99L)).thenReturn(Optional.of(other));

    assertEquals(400, assertThrows(ResponseStatusException.class,
        () -> service.register(new GraduateRequest(7L, 99L))).getStatusCode().value());
  }

  @Test
  void graduatesThatCameFromACeremonyRegistrationAreMarkedAsGraduated() {
    GraduationRegistration registration = new GraduationRegistration();
    registration.setGraduated(true);
    Graduate ceremony = new Graduate();
    ceremony.setId(1L);
    ceremony.setStudent(student);
    ceremony.setCourse(course);
    ceremony.setRegistration(registration);
    ceremony.setGraduationDate(java.time.LocalDate.of(2026, 12, 12));
    when(graduates.findAllByOrderByGraduationDateDescIdDesc()).thenReturn(List.of(ceremony));

    assertEquals("GRADUATED", service.list().get(0).status());
  }

  private Course newCourse() {
    Category category = new Category();
    category.setId(1L);
    category.setName("Informática");
    Level level = new Level();
    level.setId(1L);
    level.setName("Licenciatura");
    Modality modality = new Modality();
    modality.setId(1L);
    modality.setName("Presencial");
    Course created = new Course();
    created.setId(3L);
    created.setName("Curso 3");
    created.setDurationMonths(36);
    created.setCategory(category);
    created.setLevel(level);
    created.setModality(modality);
    return created;
  }
}
