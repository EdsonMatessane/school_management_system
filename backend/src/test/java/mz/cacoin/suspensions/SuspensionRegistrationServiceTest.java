package mz.cacoin.suspensions;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import mz.cacoin.courses.Course;
import mz.cacoin.courses.CourseRepository;
import mz.cacoin.courses.categories.Category;
import mz.cacoin.courses.levels.Level;
import mz.cacoin.courses.modalities.Modality;
import mz.cacoin.payments.methods.PaymentMethod;
import mz.cacoin.payments.methods.PaymentMethodRepository;
import mz.cacoin.students.Student;
import mz.cacoin.students.StudentEnrollment;
import mz.cacoin.students.StudentEnrollmentRepository;
import mz.cacoin.students.StudentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class SuspensionRegistrationServiceTest {
  private SuspensionRegistrationRepository registrations;
  private SuspensionRegistrationPaymentRepository payments;
  private StudentRepository students;
  private StudentEnrollmentRepository enrollments;
  private CourseRepository courses;
  private PaymentMethodRepository paymentMethods;
  private SuspensionSettingsService suspensionSettings;
  private SuspensionRegistrationService service;
  private Student student;
  private Course course;

  @BeforeEach
  void setUp() {
    registrations = mock(SuspensionRegistrationRepository.class);
    payments = mock(SuspensionRegistrationPaymentRepository.class);
    students = mock(StudentRepository.class);
    enrollments = mock(StudentEnrollmentRepository.class);
    courses = mock(CourseRepository.class);
    paymentMethods = mock(PaymentMethodRepository.class);
    suspensionSettings = mock(SuspensionSettingsService.class);
    service = new SuspensionRegistrationService(
        registrations, payments, students, enrollments, courses, paymentMethods,
        suspensionSettings);

    student = new Student();
    student.setId(7L);
    student.setStudentYear(2026);
    student.setStudentNumber(7);
    student.setFirstName("Ana");
    student.setSurname("Matsinhe");
    course = newCourse(3L);
    when(students.findById(7L)).thenReturn(Optional.of(student));
    when(courses.findById(3L)).thenReturn(Optional.of(course));
    when(suspensionSettings.activeFee()).thenReturn(new BigDecimal("400.00"));
    when(registrations.save(any(SuspensionRegistration.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    when(payments.save(any(SuspensionRegistrationPayment.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    StudentEnrollment enrollment = new StudentEnrollment();
    enrollment.setStudent(student);
    enrollment.setCourse(course);
    when(enrollments.findFirstByStudentIdOrderByCreatedAtDescIdDesc(7L))
        .thenReturn(Optional.of(enrollment));
  }

  @Test
  void createUsesTheConfiguredFeeAndDefaultsTheDateToToday() {
    SuspensionRegistrationResponse response =
        service.create(new SuspensionRegistrationRequest(7L, 3L, null));

    assertEquals(new BigDecimal("400.00"), response.amount());
    assertEquals(LocalDate.now(), response.suspensionDate());
    assertEquals("PAYMENT_PENDING", response.status());
    assertEquals("CACOIN202607", response.studentCode());
    assertEquals(24, response.durationMonths());
  }

  @Test
  void createRejectsFutureDatesMissingFeeDuplicatesAndOtherCourses() {
    assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.create(
        new SuspensionRegistrationRequest(7L, 3L, LocalDate.now().plusDays(1))))
        .getStatusCode().value());

    when(courses.findById(99L)).thenReturn(Optional.of(newCourse(99L)));
    assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.create(
        new SuspensionRegistrationRequest(7L, 99L, null))).getStatusCode().value());

    when(registrations.existsByStudentId(7L)).thenReturn(true);
    assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.create(
        new SuspensionRegistrationRequest(7L, 3L, null))).getStatusCode().value());

    when(suspensionSettings.activeFee()).thenReturn(BigDecimal.ZERO);
    assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.create(
        new SuspensionRegistrationRequest(7L, 3L, null))).getStatusCode().value());
    verify(registrations, never()).save(any(SuspensionRegistration.class));
  }

  @Test
  void payingRecordsThePaymentAndSuspendingRequiresIt() {
    SuspensionRegistration registration = registration(false, false);
    when(registrations.findByIdForUpdate(1L)).thenReturn(Optional.of(registration));
    assertEquals(409, assertThrows(ResponseStatusException.class,
        () -> service.suspend(1L)).getStatusCode().value());

    PaymentMethod method = new PaymentMethod();
    method.setName("Numerário");
    when(paymentMethods.findByNameIgnoreCase("Numerário")).thenReturn(Optional.of(method));
    SuspensionRegistrationResponse paid = service.pay(
        1L, new SuspensionRegistrationPaymentRequest(LocalDate.now(), "Numerário", null));

    assertTrue(registration.isPaid());
    assertEquals("PAID", paid.status());
    assertEquals(new BigDecimal("400.00"), paid.payment().amount());

    SuspensionRegistrationResponse suspended = service.suspend(1L);

    assertTrue(registration.isSuspended());
    assertEquals("SUSPENDED", suspended.status());
  }

  @Test
  void payingOrSuspendingTwiceIsRejected() {
    when(registrations.findByIdForUpdate(1L)).thenReturn(Optional.of(registration(true, true)));

    assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.pay(
        1L, new SuspensionRegistrationPaymentRequest(LocalDate.now(), "Numerário", null)))
        .getStatusCode().value());
    assertEquals(409, assertThrows(ResponseStatusException.class,
        () -> service.suspend(1L)).getStatusCode().value());
    assertFalse(registration(false, false).isPaid());
    verify(payments, never()).save(any(SuspensionRegistrationPayment.class));
  }

  private SuspensionRegistration registration(boolean paid, boolean suspended) {
    SuspensionRegistration registration = new SuspensionRegistration();
    registration.setId(1L);
    registration.setStudent(student);
    registration.setCourse(course);
    registration.setAmount(new BigDecimal("400.00"));
    registration.setSuspensionDate(LocalDate.now());
    registration.setPaid(paid);
    registration.setSuspended(suspended);
    return registration;
  }

  private Course newCourse(Long id) {
    Category category = new Category();
    category.setId(1L);
    category.setName("Informática");
    Level level = new Level();
    level.setId(1L);
    level.setName("Básico");
    Modality modality = new Modality();
    modality.setId(1L);
    modality.setName("Presencial");
    Course created = new Course();
    created.setId(id);
    created.setName("Curso " + id);
    created.setDurationMonths(24);
    created.setCategory(category);
    created.setLevel(level);
    created.setModality(modality);
    return created;
  }
}
