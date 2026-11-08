package mz.cacoin.attendances;

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
import java.util.List;
import java.util.Optional;
import mz.cacoin.courses.Course;
import mz.cacoin.courses.CourseRepository;
import mz.cacoin.courses.categories.Category;
import mz.cacoin.courses.levels.Level;
import mz.cacoin.courses.modalities.Modality;
import mz.cacoin.payments.methods.PaymentMethod;
import mz.cacoin.payments.methods.PaymentMethodRepository;
import mz.cacoin.staff.StaffCourseAssignment;
import mz.cacoin.staff.StaffMember;
import mz.cacoin.staff.StaffRepository;
import mz.cacoin.students.Student;
import mz.cacoin.students.StudentEnrollment;
import mz.cacoin.students.StudentEnrollmentRepository;
import mz.cacoin.students.StudentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class AttendanceServiceTest {
  private AttendanceRecordRepository records;
  private AttendanceJustificationPaymentRepository payments;
  private AttendanceNotificationRepository notifications;
  private AttendanceTeacherAssignmentRepository teacherAssignments;
  private StaffRepository staff;
  private StudentRepository students;
  private StudentEnrollmentRepository enrollments;
  private CourseRepository courses;
  private PaymentMethodRepository paymentMethods;
  private AttendanceSettingsService attendanceSettings;
  private AttendanceService service;
  private Student student;
  private Course course;
  private StaffMember teacher;

  @BeforeEach
  void setUp() {
    records = mock(AttendanceRecordRepository.class);
    payments = mock(AttendanceJustificationPaymentRepository.class);
    notifications = mock(AttendanceNotificationRepository.class);
    teacherAssignments = mock(AttendanceTeacherAssignmentRepository.class);
    staff = mock(StaffRepository.class);
    students = mock(StudentRepository.class);
    enrollments = mock(StudentEnrollmentRepository.class);
    courses = mock(CourseRepository.class);
    paymentMethods = mock(PaymentMethodRepository.class);
    attendanceSettings = mock(AttendanceSettingsService.class);
    service = new AttendanceService(
        records, payments, notifications, teacherAssignments, staff, students,
        enrollments, courses, paymentMethods, attendanceSettings);

    student = new Student();
    student.setId(7L);
    student.setStudentYear(2026);
    student.setStudentNumber(7);
    student.setFirstName("Ana");
    student.setSurname("Matsinhe");
    course = newCourse(3L);
    teacher = new StaffMember();
    teacher.setId(5L);
    teacher.setStaffType("teachers");
    teacher.setActive(true);
    teacher.setFirstName("Carlos");
    teacher.setSurname("Mondlane");

    when(students.findById(7L)).thenReturn(Optional.of(student));
    when(courses.findById(3L)).thenReturn(Optional.of(course));
    when(staff.findById(5L)).thenReturn(Optional.of(teacher));
    when(teacherAssignments.existsByStaffMemberIdAndCourseIdAndActiveTrue(5L, 3L))
        .thenReturn(true);
    when(records.save(any(AttendanceRecord.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    when(payments.save(any(AttendanceJustificationPayment.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    when(attendanceSettings.maxAbsences()).thenReturn(2);
    when(attendanceSettings.notificationMessage()).thenReturn("Excedeu as faltas");
    when(attendanceSettings.justificationFee()).thenReturn(new BigDecimal("100.00"));
    StudentEnrollment enrollment = new StudentEnrollment();
    enrollment.setStudent(student);
    enrollment.setCourse(course);
    when(enrollments.findFirstByStudentIdOrderByCreatedAtDescIdDesc(7L))
        .thenReturn(Optional.of(enrollment));
  }

  @Test
  void presentRecordStoresTheTeacherAndNeverNotifies() {
    AttendanceRecordResponse response =
        service.create(new AttendanceRecordRequest(7L, 3L, 5L, null, "present"));

    assertEquals("PRESENT", response.status());
    assertEquals(LocalDate.now(), response.date());
    assertEquals("Carlos Mondlane", response.teacherName());
    assertEquals("CACOIN202607", response.studentCode());
    assertEquals("NONE", response.justification());
    verify(notifications, never()).save(any(AttendanceNotification.class));
  }

  @Test
  void absenceThatCrossesTheLimitCreatesOneNotificationWithTheConfiguredMessage() {
    when(records.countUnjustifiedAbsences(7L)).thenReturn(3L);

    service.create(new AttendanceRecordRequest(7L, 3L, 5L, null, "ABSENT"));

    org.mockito.ArgumentCaptor<AttendanceNotification> captor =
        org.mockito.ArgumentCaptor.forClass(AttendanceNotification.class);
    verify(notifications).save(captor.capture());
    assertEquals("Excedeu as faltas", captor.getValue().getMessage());
    assertEquals(3, captor.getValue().getAbsences());
  }

  @Test
  void absenceBelowOrFarAboveTheLimitDoesNotNotifyAgain() {
    when(records.countUnjustifiedAbsences(7L)).thenReturn(2L, 5L);

    service.create(new AttendanceRecordRequest(7L, 3L, 5L, LocalDate.now().minusDays(1), "ABSENT"));
    service.create(new AttendanceRecordRequest(7L, 3L, 5L, null, "ABSENT"));

    verify(notifications, never()).save(any(AttendanceNotification.class));
  }

  @Test
  void createRejectsInvalidDataTeachersAndDuplicates() {
    assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.create(
        new AttendanceRecordRequest(7L, 3L, 5L, null, "LATE"))).getStatusCode().value());
    assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.create(
        new AttendanceRecordRequest(7L, 3L, 5L, LocalDate.now().plusDays(1), "PRESENT")))
        .getStatusCode().value());

    when(teacherAssignments.existsByStaffMemberIdAndCourseIdAndActiveTrue(5L, 3L))
        .thenReturn(false);
    assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.create(
        new AttendanceRecordRequest(7L, 3L, 5L, null, "PRESENT"))).getStatusCode().value());

    when(teacherAssignments.existsByStaffMemberIdAndCourseIdAndActiveTrue(5L, 3L))
        .thenReturn(true);
    when(records.existsByStudentIdAndAttendanceDate(7L, LocalDate.now())).thenReturn(true);
    assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.create(
        new AttendanceRecordRequest(7L, 3L, 5L, null, "PRESENT"))).getStatusCode().value());
    verify(records, never()).save(any(AttendanceRecord.class));
  }

  @Test
  void createRejectsStudentNotEnrolledInTheCourseAndInactiveTeacher() {
    when(courses.findById(99L)).thenReturn(Optional.of(newCourse(99L)));
    assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.create(
        new AttendanceRecordRequest(7L, 99L, 5L, null, "PRESENT"))).getStatusCode().value());

    teacher.setActive(false);
    assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.create(
        new AttendanceRecordRequest(7L, 3L, 5L, null, "PRESENT"))).getStatusCode().value());
  }

  @Test
  void justificationIsRequestedOnlyOnceAndOnlyForAbsences() {
    AttendanceRecord absence = record("ABSENT");
    AttendanceRecord present = record("PRESENT");
    when(records.findByIdForUpdate(1L)).thenReturn(Optional.of(absence));
    when(records.findByIdForUpdate(2L)).thenReturn(Optional.of(present));

    AttendanceRecordResponse response = service.requestJustification(1L);

    assertEquals("PAYMENT_PENDING", response.justification());
    assertEquals(new BigDecimal("100.00"), response.justificationFee());
    assertEquals(409, assertThrows(ResponseStatusException.class,
        () -> service.requestJustification(1L)).getStatusCode().value());
    assertEquals(409, assertThrows(ResponseStatusException.class,
        () -> service.requestJustification(2L)).getStatusCode().value());
  }

  @Test
  void zeroJustificationFeeJustifiesTheAbsenceImmediately() {
    when(attendanceSettings.justificationFee()).thenReturn(BigDecimal.ZERO);
    AttendanceRecord absence = record("ABSENT");
    when(records.findByIdForUpdate(1L)).thenReturn(Optional.of(absence));

    AttendanceRecordResponse response = service.requestJustification(1L);

    assertEquals("JUSTIFIED", response.justification());
    assertTrue(absence.isJustificationPaid());
  }

  @Test
  void payingTheJustificationMarksItAsJustifiedAndRecordsThePayment() {
    AttendanceRecord absence = record("ABSENT");
    absence.setJustificationFee(new BigDecimal("100.00"));
    when(records.findByIdForUpdate(1L)).thenReturn(Optional.of(absence));
    PaymentMethod method = new PaymentMethod();
    method.setName("Numerário");
    when(paymentMethods.findByNameIgnoreCase("Numerário")).thenReturn(Optional.of(method));

    AttendanceRecordResponse response = service.payJustification(
        1L, new AttendanceJustificationPaymentRequest(LocalDate.of(2026, 10, 21), "Numerário", null));

    assertEquals("JUSTIFIED", response.justification());
    assertEquals(LocalDate.of(2026, 10, 21), response.justificationDate());
    assertEquals(new BigDecimal("100.00"), response.payment().amount());
    assertTrue(absence.isJustificationPaid());
  }

  @Test
  void payingRequiresARequestedUnpaidJustification() {
    AttendanceRecord notRequested = record("ABSENT");
    AttendanceRecord paid = record("ABSENT");
    paid.setJustificationFee(new BigDecimal("100.00"));
    paid.setJustificationPaid(true);
    when(records.findByIdForUpdate(1L)).thenReturn(Optional.of(notRequested));
    when(records.findByIdForUpdate(2L)).thenReturn(Optional.of(paid));
    AttendanceJustificationPaymentRequest request =
        new AttendanceJustificationPaymentRequest(LocalDate.now(), "Numerário", null);

    assertEquals(409, assertThrows(ResponseStatusException.class,
        () -> service.payJustification(1L, request)).getStatusCode().value());
    assertEquals(409, assertThrows(ResponseStatusException.class,
        () -> service.payJustification(2L, request)).getStatusCode().value());
    verify(payments, never()).save(any(AttendanceJustificationPayment.class));
  }

  @Test
  void statusChangeAndDeletionAreBlockedOnceTheJustificationStarted() {
    AttendanceRecord justified = record("ABSENT");
    justified.setJustificationFee(new BigDecimal("100.00"));
    when(records.findByIdForUpdate(1L)).thenReturn(Optional.of(justified));

    assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.updateStatus(
        1L, new AttendanceStatusRequest("PRESENT"))).getStatusCode().value());
    assertEquals(409, assertThrows(ResponseStatusException.class,
        () -> service.delete(1L)).getStatusCode().value());
    verify(records, never()).delete(any(AttendanceRecord.class));
  }

  @Test
  void excessesListOnlyStudentsAboveTheLimitWithTheirNotification() {
    AttendanceRecord first = record("ABSENT");
    first.setAttendanceDate(LocalDate.of(2026, 10, 1));
    AttendanceRecord second = record("ABSENT");
    second.setAttendanceDate(LocalDate.of(2026, 10, 8));
    AttendanceRecord third = record("ABSENT");
    third.setAttendanceDate(LocalDate.of(2026, 10, 15));
    when(records.findUnjustifiedAbsences()).thenReturn(List.of(third, second, first));
    AttendanceNotification notification = new AttendanceNotification();
    notification.setStudent(student);
    notification.setMessage("Excedeu as faltas");
    notification.setCreatedAt(java.time.Instant.now());
    when(notifications.findAllByStudentIdInOrderByIdDesc(any()))
        .thenReturn(List.of(notification));

    List<AttendanceExcessResponse> excesses = service.excesses();

    assertEquals(1, excesses.size());
    assertEquals(3, excesses.get(0).absences());
    assertEquals(2, excesses.get(0).maxAbsences());
    assertEquals(LocalDate.of(2026, 10, 15), excesses.get(0).lastAbsenceDate());
    assertTrue(excesses.get(0).notified());
    assertEquals("Carlos Mondlane", excesses.get(0).teacherName());
  }

  @Test
  void excessesAreEmptyWithoutLimitOrWhenTheStudentIsWithinIt() {
    when(records.findUnjustifiedAbsences()).thenReturn(List.of(record("ABSENT"), record("ABSENT")));
    assertTrue(service.excesses().isEmpty());

    when(attendanceSettings.maxAbsences()).thenReturn(null);
    assertFalse(service.excesses().size() > 0);
  }

  @Test
  void teachersOfACourseExcludeInactiveOnes() {
    StaffMember inactive = new StaffMember();
    inactive.setId(6L);
    inactive.setStaffType("teachers");
    inactive.setActive(false);
    inactive.setFirstName("Zé");
    StaffCourseAssignment active = new StaffCourseAssignment();
    active.setStaffMember(teacher);
    StaffCourseAssignment other = new StaffCourseAssignment();
    other.setStaffMember(inactive);
    when(teacherAssignments.findAllByCourseIdAndActiveTrue(3L)).thenReturn(List.of(other, active));

    List<AttendanceTeacherResponse> teachers = service.teachers(3L);

    assertEquals(1, teachers.size());
    assertEquals("Carlos Mondlane", teachers.get(0).name());
  }

  private AttendanceRecord record(String status) {
    AttendanceRecord record = new AttendanceRecord();
    record.setId(1L);
    record.setStudent(student);
    record.setCourse(course);
    record.setTeacher(teacher);
    record.setAttendanceDate(LocalDate.now());
    record.setStatus(status);
    return record;
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
