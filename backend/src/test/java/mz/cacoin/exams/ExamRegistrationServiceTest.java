package mz.cacoin.exams;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
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

class ExamRegistrationServiceTest {
  private ExamRegistrationRepository registrations;
  private ExamRegistrationPaymentRepository payments;
  private StudentRepository students;
  private StudentEnrollmentRepository enrollments;
  private CourseRepository courses;
  private PaymentMethodRepository paymentMethods;
  private ExamSettingsService examSettings;
  private ExamRegistrationService service;
  private Student student;
  private Course course;

  @BeforeEach
  void setUp() {
    registrations = mock(ExamRegistrationRepository.class);
    payments = mock(ExamRegistrationPaymentRepository.class);
    students = mock(StudentRepository.class);
    enrollments = mock(StudentEnrollmentRepository.class);
    courses = mock(CourseRepository.class);
    paymentMethods = mock(PaymentMethodRepository.class);
    examSettings = mock(ExamSettingsService.class);
    service = new ExamRegistrationService(
        registrations, payments, students, enrollments, courses, paymentMethods, examSettings);

    student = new Student();
    student.setId(7L);
    student.setStudentYear(2026);
    student.setStudentNumber(7);
    student.setFirstName("Ana");
    student.setSurname("Matsinhe");
    course = newCourse(3L);
    when(students.findById(7L)).thenReturn(Optional.of(student));
    when(courses.findById(3L)).thenReturn(Optional.of(course));
    when(registrations.save(any(ExamRegistration.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
  }

  @Test
  void createUsesTheFeeDefinedInSettings() {
    enrolStudentIn(course);
    when(examSettings.feeFor("RECURRENCE")).thenReturn(new BigDecimal("250.00"));

    ExamRegistrationResponse response =
        service.create(new ExamRegistrationRequest(7L, 3L, "recurrence"));

    assertEquals("RECURRENCE", response.examType());
    assertEquals(new BigDecimal("250.00"), response.amount());
    assertEquals(new BigDecimal("250.00"), response.balance());
    assertEquals("PENDING", response.status());
    assertEquals("CACOIN202607", response.studentCode());
    assertEquals("Ana Matsinhe", response.studentName());
    verify(examSettings).requireExamPeriodOpen();
  }

  @Test
  void createRejectsStudentNotEnrolledInTheSelectedCourse() {
    enrolStudentIn(newCourse(99L));
    when(examSettings.feeFor("NORMAL")).thenReturn(new BigDecimal("250.00"));

    ResponseStatusException exception = assertThrows(
        ResponseStatusException.class,
        () -> service.create(new ExamRegistrationRequest(7L, 3L, "NORMAL")));

    assertEquals(400, exception.getStatusCode().value());
    verify(registrations, never()).save(any(ExamRegistration.class));
  }

  @Test
  void createRejectsInvalidExamType() {
    ResponseStatusException exception = assertThrows(
        ResponseStatusException.class,
        () -> service.create(new ExamRegistrationRequest(7L, 3L, "RECOVERY")));

    assertEquals(400, exception.getStatusCode().value());
    verify(registrations, never()).save(any(ExamRegistration.class));
  }

  @Test
  void createWithoutFeeCreatesFreeRegistration() {
    enrolStudentIn(course);
    when(examSettings.feeFor("SPECIAL")).thenReturn(BigDecimal.ZERO);

    ExamRegistrationResponse response =
        service.create(new ExamRegistrationRequest(7L, 3L, "SPECIAL"));

    assertEquals("FREE", response.status());
    assertEquals(0, response.amount().signum());
    assertEquals(0, response.balance().signum());
  }

  @Test
  void listRejectsUnknownExamType() {
    ResponseStatusException exception =
        assertThrows(ResponseStatusException.class, () -> service.list("RECOVERY"));

    assertEquals(400, exception.getStatusCode().value());
  }

  @Test
  void paymentCannotExceedPendingBalance() {
    ExamRegistration registration = registration("100.00", "40.00");
    when(registrations.findByIdForUpdate(1L)).thenReturn(Optional.of(registration));

    ResponseStatusException exception = assertThrows(
        ResponseStatusException.class,
        () -> service.recordPayment(1L, paymentRequest("70.00")));

    assertEquals(400, exception.getStatusCode().value());
    verify(payments, never()).save(any(ExamRegistrationPayment.class));
  }

  @Test
  void fullPaymentMarksRegistrationAsPaid() {
    ExamRegistration registration = registration("100.00", "40.00");
    when(registrations.findByIdForUpdate(1L)).thenReturn(Optional.of(registration));
    PaymentMethod method = new PaymentMethod();
    method.setName("Numerário");
    when(paymentMethods.findByNameIgnoreCase("Numerário")).thenReturn(Optional.of(method));

    ExamRegistrationResponse response = service.recordPayment(1L, paymentRequest("60.00"));

    assertEquals(new BigDecimal("100.00"), registration.getPaidAmount());
    assertEquals("PAID", response.status());
    assertEquals(0, response.balance().signum());
    verify(payments).save(any(ExamRegistrationPayment.class));
  }

  private void enrolStudentIn(Course enrolledCourse) {
    StudentEnrollment enrollment = new StudentEnrollment();
    enrollment.setStudent(student);
    enrollment.setCourse(enrolledCourse);
    when(enrollments.findFirstByStudentIdOrderByCreatedAtDescIdDesc(7L))
        .thenReturn(Optional.of(enrollment));
  }

  private ExamRegistration registration(String amount, String paidAmount) {
    ExamRegistration registration = new ExamRegistration();
    registration.setStudent(student);
    registration.setCourse(course);
    registration.setExamType("NORMAL");
    registration.setAmount(new BigDecimal(amount));
    registration.setPaidAmount(new BigDecimal(paidAmount));
    return registration;
  }

  private ExamRegistrationPaymentRequest paymentRequest(String amount) {
    return new ExamRegistrationPaymentRequest(
        new BigDecimal(amount), LocalDate.of(2026, 10, 18), "Numerário", null);
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
    created.setCategory(category);
    created.setLevel(level);
    created.setModality(modality);
    return created;
  }
}
