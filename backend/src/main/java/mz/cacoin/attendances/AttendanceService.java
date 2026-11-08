package mz.cacoin.attendances;

import mz.cacoin.teacher.TeacherContext;
import mz.cacoin.settings.SystemDate;
import mz.cacoin.common.StudentCodes;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import mz.cacoin.courses.Course;
import mz.cacoin.courses.CourseRepository;
import mz.cacoin.payments.methods.PaymentMethod;
import mz.cacoin.payments.methods.PaymentMethodRepository;
import mz.cacoin.staff.StaffCourseAssignment;
import mz.cacoin.staff.StaffMember;
import mz.cacoin.staff.StaffRepository;
import mz.cacoin.students.Student;
import mz.cacoin.students.StudentEnrollmentRepository;
import mz.cacoin.students.StudentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AttendanceService {
  static final String PRESENT = "PRESENT";
  static final String ABSENT = "ABSENT";

  private final AttendanceRecordRepository records;
  private final AttendanceJustificationPaymentRepository payments;
  private final AttendanceNotificationRepository notifications;
  private final AttendanceTeacherAssignmentRepository teacherAssignments;
  private final StaffRepository staff;
  private final StudentRepository students;
  private final StudentEnrollmentRepository enrollments;
  private final CourseRepository courses;
  private final PaymentMethodRepository paymentMethods;
  private final AttendanceSettingsService attendanceSettings;

  @Transactional(readOnly = true)
  public List<AttendanceRecordResponse> list() {
    List<AttendanceRecord> found = records.findAllByOrderByAttendanceDateDescIdDesc();
    if (found.isEmpty()) {
      return List.of();
    }
    Map<Long, AttendanceJustificationPayment> paymentByRecord = payments
        .findAllByRecordIdIn(found.stream().map(AttendanceRecord::getId).toList()).stream()
        .collect(Collectors.toMap(payment -> payment.getRecord().getId(), Function.identity()));
    return found.stream()
        .map(item -> toResponse(item, paymentByRecord.get(item.getId())))
        .toList();
  }

  @Transactional(readOnly = true)
  public List<AttendanceTeacherResponse> teachers(Long courseId) {
    if (courseId == null) {
      return List.of();
    }
    return teacherAssignments.findAllByCourseIdAndActiveTrue(courseId).stream()
        .map(StaffCourseAssignment::getStaffMember)
        .filter(member -> member.isActive() && "teachers".equals(member.getStaffType()))
        .map(member -> new AttendanceTeacherResponse(member.getId(), fullName(member)))
        .sorted(Comparator.comparing(AttendanceTeacherResponse::name,
            String.CASE_INSENSITIVE_ORDER))
        .toList();
  }

  @Transactional
  public AttendanceRecordResponse create(AttendanceRecordRequest request) {
    if (request == null || request.studentId() == null
        || request.courseId() == null || request.teacherId() == null) {
      throw badRequest("Indique o curso, o estudante, o professor e o estado");
    }
    TeacherContext.requireCourse(request.courseId());
    TeacherContext.requireSelf(request.teacherId());
    String status = normalizeStatus(request.status());
    LocalDate date = request.date() == null ? SystemDate.today() : request.date();
    if (date.isAfter(SystemDate.today())) {
      throw badRequest("A data da presença não pode ser futura");
    }
    Student student = students.findById(request.studentId())
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O estudante não foi encontrado"));
    if (!student.isActive()) {
      throw badRequest("O estudante selecionado está inativo");
    }
    Course course = courses.findById(request.courseId())
        .filter(Course::isActive)
        .orElseThrow(() -> badRequest("O curso selecionado não existe ou está inativo"));
    Long enrolledCourseId = enrollments
        .findFirstByStudentIdOrderByCreatedAtDescIdDesc(student.getId())
        .map(enrollment -> enrollment.getCourse().getId())
        .orElse(null);
    if (!course.getId().equals(enrolledCourseId)) {
      throw badRequest("O estudante não está inscrito no curso selecionado");
    }
    StaffMember teacher = staff.findById(request.teacherId())
        .filter(member -> member.isActive() && "teachers".equals(member.getStaffType()))
        .orElseThrow(() -> badRequest("O professor selecionado não existe ou está inativo"));
    if (!teacherAssignments.existsByStaffMemberIdAndCourseIdAndActiveTrue(
        teacher.getId(), course.getId())) {
      throw badRequest("O professor selecionado não está atribuído a este curso");
    }
    if (records.existsByStudentIdAndAttendanceDate(student.getId(), date)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Já existe um registo deste estudante nesta data");
    }

    AttendanceRecord record = new AttendanceRecord();
    record.setStudent(student);
    record.setCourse(course);
    record.setTeacher(teacher);
    record.setAttendanceDate(date);
    record.setStatus(status);
    AttendanceRecord saved = records.save(record);
    if (ABSENT.equals(status)) {
      notifyIfExceeded(student);
    }
    return toResponse(saved, null);
  }

  @Transactional
  public AttendanceRecordResponse updateStatus(Long id, AttendanceStatusRequest request) {
    AttendanceRecord record = findForUpdate(id);
    String status = normalizeStatus(request == null ? null : request.status());
    if (record.getJustificationFee() != null) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Não é possível alterar uma falta com justificação iniciada");
    }
    record.setStatus(status);
    AttendanceRecord saved = records.save(record);
    if (ABSENT.equals(status)) {
      notifyIfExceeded(saved.getStudent());
    }
    return toResponse(saved, null);
  }

  @Transactional
  public void delete(Long id) {
    AttendanceRecord record = findForUpdate(id);
    if (record.getJustificationFee() != null) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Não é possível apagar uma falta com justificação iniciada");
    }
    records.delete(record);
  }

  @Transactional
  public AttendanceRecordResponse requestJustification(Long id) {
    AttendanceRecord record = findForUpdate(id);
    if (!ABSENT.equals(record.getStatus())) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Só é possível justificar faltas");
    }
    if (record.getJustificationFee() != null) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "A justificação desta falta já foi iniciada");
    }
    BigDecimal fee = attendanceSettings.justificationFee();
    record.setJustificationFee(fee);
    record.setJustificationDate(SystemDate.today());
    record.setJustificationPaid(fee.signum() == 0);
    return toResponse(records.save(record), null);
  }

  @Transactional
  public AttendanceRecordResponse payJustification(
      Long id, AttendanceJustificationPaymentRequest request) {
    if (request == null || request.paymentDate() == null
        || request.method() == null || request.method().isBlank()) {
      throw badRequest("Indique a data e o método de pagamento");
    }
    AttendanceRecord record = findForUpdate(id);
    if (record.getJustificationFee() == null) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "A justificação desta falta ainda não foi iniciada");
    }
    if (record.isJustificationPaid()) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "O pagamento desta justificação já foi registado");
    }
    PaymentMethod method = paymentMethods.findByNameIgnoreCase(request.method().trim())
        .filter(PaymentMethod::isActive)
        .orElseThrow(() -> badRequest("O método de pagamento não existe ou está inativo"));

    AttendanceJustificationPayment payment = new AttendanceJustificationPayment();
    payment.setRecord(record);
    payment.setAmount(record.getJustificationFee());
    payment.setPaymentDate(request.paymentDate());
    payment.setMethod(method.getName());
    payment.setReference(request.reference() == null ? null : request.reference().trim());
    payments.save(payment);
    record.setJustificationPaid(true);
    record.setJustificationDate(request.paymentDate());
    return toResponse(records.save(record), payment);
  }

  @Transactional(readOnly = true)
  public List<AttendanceExcessResponse> excesses() {
    Integer max = attendanceSettings.maxAbsences();
    if (max == null) {
      return List.of();
    }
    Map<Long, List<AttendanceRecord>> byStudent = records.findUnjustifiedAbsences().stream()
        .collect(Collectors.groupingBy(
            record -> record.getStudent().getId(), LinkedHashMap::new, Collectors.toList()));
    List<Long> excessStudentIds = byStudent.entrySet().stream()
        .filter(entry -> entry.getValue().size() > max)
        .map(Map.Entry::getKey)
        .toList();
    if (excessStudentIds.isEmpty()) {
      return List.of();
    }
    Map<Long, AttendanceNotification> latestNotification = new LinkedHashMap<>();
    notifications.findAllByStudentIdInOrderByIdDesc(excessStudentIds)
        .forEach(item -> latestNotification.putIfAbsent(item.getStudent().getId(), item));

    return excessStudentIds.stream().map(studentId -> {
      List<AttendanceRecord> absences = byStudent.get(studentId);
      AttendanceRecord last = absences.get(0);
      Student student = last.getStudent();
      Course course = last.getCourse();
      AttendanceNotification notification = latestNotification.get(studentId);
      return new AttendanceExcessResponse(
          student.getId(),
          studentCode(student),
          fullName(student),
          course.getId(),
          course.getName(),
          course.getCategory().getId(),
          course.getCategory().getName(),
          course.getLevel().getId(),
          course.getLevel().getName(),
          course.getModality().getId(),
          course.getModality().getName(),
          course.getDurationMonths(),
          absences.size(),
          max,
          last.getAttendanceDate(),
          fullName(last.getTeacher()),
          notification != null,
          notification == null ? null : notification.getMessage(),
          notification == null
              ? null
              : notification.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate());
    }).toList();
  }

  private void notifyIfExceeded(Student student) {
    Integer max = attendanceSettings.maxAbsences();
    if (max == null) {
      return;
    }
    long count = records.countUnjustifiedAbsences(student.getId());
    if (count == max + 1L) {
      AttendanceNotification notification = new AttendanceNotification();
      notification.setStudent(student);
      notification.setMessage(attendanceSettings.notificationMessage());
      notification.setAbsences((int) count);
      notifications.save(notification);
    }
  }

  private String normalizeStatus(String status) {
    String normalized = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
    if (!PRESENT.equals(normalized) && !ABSENT.equals(normalized)) {
      throw badRequest("Indique o estado da presença (presente ou ausente)");
    }
    return normalized;
  }

  private AttendanceRecord findForUpdate(Long id) {
    return records.findByIdForUpdate(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O registo de presença não foi encontrado"));
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

  private AttendanceRecordResponse toResponse(
      AttendanceRecord record, AttendanceJustificationPayment payment) {
    Student student = record.getStudent();
    Course course = record.getCourse();
    String justification = record.getJustificationFee() == null
        ? "NONE"
        : record.isJustificationPaid() ? "JUSTIFIED" : "PAYMENT_PENDING";
    return new AttendanceRecordResponse(
        record.getId(),
        student.getId(),
        studentCode(student),
        fullName(student),
        course.getId(),
        course.getName(),
        course.getCategory().getId(),
        course.getCategory().getName(),
        course.getLevel().getId(),
        course.getLevel().getName(),
        course.getModality().getId(),
        course.getModality().getName(),
        course.getDurationMonths(),
        record.getTeacher().getId(),
        fullName(record.getTeacher()),
        record.getAttendanceDate(),
        record.getStatus(),
        justification,
        record.getJustificationFee(),
        record.getJustificationDate(),
        payment == null ? null : new AttendanceJustificationPaymentResponse(
            payment.getId(),
            payment.getAmount(),
            payment.getPaymentDate(),
            payment.getMethod(),
            payment.getReference()));
  }

  private ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
