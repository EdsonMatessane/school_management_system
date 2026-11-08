package mz.cacoin.graduations;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentCaptor.forClass;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
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
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class GraduationRegistrationServiceTest {
  private GraduationRegistrationRepository registrations;
  private GraduationRegistrationPaymentRepository payments;
  private GraduateRepository graduates;
  private StudentRepository students;
  private StudentEnrollmentRepository enrollments;
  private CourseRepository courses;
  private PaymentMethodRepository paymentMethods;
  private GraduationSettingsService graduationSettings;
  private GraduationRegistrationService service;
  private Student student;
  private Course course;

  @BeforeEach
  void setUp() {
    registrations = mock(GraduationRegistrationRepository.class);
    payments = mock(GraduationRegistrationPaymentRepository.class);
    graduates = mock(GraduateRepository.class);
    students = mock(StudentRepository.class);
    enrollments = mock(StudentEnrollmentRepository.class);
    courses = mock(CourseRepository.class);
    paymentMethods = mock(PaymentMethodRepository.class);
    graduationSettings = mock(GraduationSettingsService.class);
    service = new GraduationRegistrationService(
        registrations, payments, graduates, students, enrollments, courses,
        paymentMethods, graduationSettings);

    student = new Student();
    student.setId(7L);
    student.setStudentYear(2026);
    student.setStudentNumber(7);
    student.setFirstName("Ana");
    student.setSurname("Matsinhe");
    course = newCourse(3L);
    when(students.findById(7L)).thenReturn(Optional.of(student));
    when(courses.findById(3L)).thenReturn(Optional.of(course));
    when(graduationSettings.quote(2)).thenReturn(new GraduationQuote(
        new BigDecimal("2500.00"), new BigDecimal("650.00"), 0,
        new BigDecimal("0.00"), new BigDecimal("3150.00")));
    when(registrations.save(any(GraduationRegistration.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    when(payments.save(any(GraduationRegistrationPayment.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    when(graduates.save(any(Graduate.class))).thenAnswer(invocation -> invocation.getArgument(0));
    StudentEnrollment enrollment = new StudentEnrollment();
    enrollment.setStudent(student);
    enrollment.setCourse(course);
    when(enrollments.findFirstByStudentIdOrderByCreatedAtDescIdDesc(7L))
        .thenReturn(Optional.of(enrollment));
  }

  @Test
  void createStoresTheQuotedAmountsAndTheCourseDuration() {
    GraduationRegistrationResponse response =
        service.create(new GraduationRegistrationRequest(7L, 3L, 2));

    assertEquals(new BigDecimal("3150.00"), response.amount());
    assertEquals(new BigDecimal("2500.00"), response.feeAmount());
    assertEquals(new BigDecimal("650.00"), response.requirementsAmount());
    assertEquals(2, response.guests());
    assertEquals(36, response.durationMonths());
    assertEquals("PAYMENT_PENDING", response.status());
    assertEquals("CACOIN202607", response.studentCode());
    verify(graduationSettings).requireRegistrationPeriodOpen();
  }

  @Test
  void createRejectsClosedPeriodDuplicatesAndTooManyGuests() {
    doThrow(new ResponseStatusException(HttpStatus.CONFLICT, "fechado"))
        .when(graduationSettings).requireRegistrationPeriodOpen();
    assertEquals(409, assertThrows(ResponseStatusException.class,
        () -> service.create(new GraduationRegistrationRequest(7L, 3L, 2)))
        .getStatusCode().value());

    org.mockito.Mockito.reset(graduationSettings);
    when(graduationSettings.quote(2)).thenReturn(new GraduationQuote(
        BigDecimal.TEN, BigDecimal.ZERO, 0, BigDecimal.ZERO, BigDecimal.TEN));
    when(registrations.existsByStudentId(7L)).thenReturn(true);
    assertEquals(409, assertThrows(ResponseStatusException.class,
        () -> service.create(new GraduationRegistrationRequest(7L, 3L, 2)))
        .getStatusCode().value());

    assertEquals(400, assertThrows(ResponseStatusException.class,
        () -> service.create(new GraduationRegistrationRequest(7L, 3L, 51)))
        .getStatusCode().value());
    verify(registrations, never()).save(any(GraduationRegistration.class));
  }

  @Test
  void createRejectsStudentNotEnrolledInTheSelectedCourse() {
    Course other = newCourse(99L);
    when(courses.findById(99L)).thenReturn(Optional.of(other));

    assertEquals(400, assertThrows(ResponseStatusException.class,
        () -> service.create(new GraduationRegistrationRequest(7L, 99L, 2)))
        .getStatusCode().value());
    verify(registrations, never()).save(any(GraduationRegistration.class));
  }

  @Test
  void payingRecordsThePaymentForTheFullAmount() {
    GraduationRegistration registration = registration(false, false);
    when(registrations.findByIdForUpdate(1L)).thenReturn(Optional.of(registration));
    PaymentMethod method = new PaymentMethod();
    method.setName("Numerário");
    when(paymentMethods.findByNameIgnoreCase("Numerário")).thenReturn(Optional.of(method));

    GraduationRegistrationResponse response = service.pay(
        1L, new GraduationRegistrationPaymentRequest(
            LocalDate.of(2026, 10, 20), "Numerário", null));

    assertTrue(registration.isPaid());
    assertEquals("ENROLLED", response.status());
    assertEquals(new BigDecimal("3150.00"), response.payment().amount());
  }

  @Test
  void payingTwiceIsRejected() {
    when(registrations.findByIdForUpdate(1L)).thenReturn(Optional.of(registration(true, false)));

    assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.pay(
        1L, new GraduationRegistrationPaymentRequest(LocalDate.now(), "Numerário", null)))
        .getStatusCode().value());
    verify(payments, never()).save(any(GraduationRegistrationPayment.class));
  }

  @Test
  void graduatingRequiresPayment() {
    when(registrations.findByIdForUpdate(1L)).thenReturn(Optional.of(registration(false, false)));

    assertEquals(409, assertThrows(ResponseStatusException.class,
        () -> service.graduate(1L)).getStatusCode().value());
    verify(graduates, never()).save(any(Graduate.class));
  }

  @Test
  void graduatingMarksTheStudentAndAddsHimToTheGraduates() {
    GraduationRegistration registration = registration(true, false);
    when(registrations.findByIdForUpdate(1L)).thenReturn(Optional.of(registration));
    when(graduates.findByStudentId(7L)).thenReturn(Optional.empty());

    GraduationRegistrationResponse response = service.graduate(1L);

    assertTrue(registration.isGraduated());
    assertEquals("GRADUATED", response.status());
    ArgumentCaptor<Graduate> captor = forClass(Graduate.class);
    verify(graduates).save(captor.capture());
    assertEquals(student, captor.getValue().getStudent());
    assertEquals(registration, captor.getValue().getRegistration());
    assertNotNull(captor.getValue().getGraduationDate());
  }

  @Test
  void graduatingLinksAnExistingGraduateInsteadOfDuplicatingIt() {
    GraduationRegistration registration = registration(true, false);
    Graduate existing = new Graduate();
    existing.setStudent(student);
    existing.setCourse(course);
    when(registrations.findByIdForUpdate(1L)).thenReturn(Optional.of(registration));
    when(graduates.findByStudentId(7L)).thenReturn(Optional.of(existing));

    service.graduate(1L);

    assertEquals(registration, existing.getRegistration());
  }

  @Test
  void graduatingTwiceIsRejected() {
    when(registrations.findByIdForUpdate(1L)).thenReturn(Optional.of(registration(true, true)));

    assertEquals(409, assertThrows(ResponseStatusException.class,
        () -> service.graduate(1L)).getStatusCode().value());
  }

  private GraduationRegistration registration(boolean paid, boolean graduated) {
    GraduationRegistration registration = new GraduationRegistration();
    registration.setId(1L);
    registration.setStudent(student);
    registration.setCourse(course);
    registration.setGuests(2);
    registration.setFeeAmount(new BigDecimal("2500.00"));
    registration.setRequirementsAmount(new BigDecimal("650.00"));
    registration.setExtraGuestsAmount(new BigDecimal("0.00"));
    registration.setAmount(new BigDecimal("3150.00"));
    registration.setPaid(paid);
    registration.setGraduated(graduated);
    return registration;
  }

  private Course newCourse(Long id) {
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
    created.setId(id);
    created.setName("Curso " + id);
    created.setDurationMonths(36);
    created.setCategory(category);
    created.setLevel(level);
    created.setModality(modality);
    return created;
  }
}
