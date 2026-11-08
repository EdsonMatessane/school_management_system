package mz.cacoin.suspensions;

import mz.cacoin.settings.SystemDate;
import mz.cacoin.common.StudentCodes;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import mz.cacoin.courses.Course;
import mz.cacoin.courses.CourseRepository;
import mz.cacoin.payments.methods.PaymentMethod;
import mz.cacoin.payments.methods.PaymentMethodRepository;
import mz.cacoin.students.Student;
import mz.cacoin.students.StudentEnrollmentRepository;
import mz.cacoin.students.StudentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class SuspensionRegistrationService {
  private final SuspensionRegistrationRepository registrations;
  private final SuspensionRegistrationPaymentRepository payments;
  private final StudentRepository students;
  private final StudentEnrollmentRepository enrollments;
  private final CourseRepository courses;
  private final PaymentMethodRepository paymentMethods;
  private final SuspensionSettingsService suspensionSettings;

  @Transactional(readOnly = true)
  public List<SuspensionRegistrationResponse> list() {
    List<SuspensionRegistration> found = registrations.findAllByOrderByCreatedAtDescIdDesc();
    if (found.isEmpty()) {
      return List.of();
    }
    Map<Long, SuspensionRegistrationPayment> paymentByRegistration = payments
        .findAllByRegistrationIdIn(found.stream().map(SuspensionRegistration::getId).toList())
        .stream()
        .collect(Collectors.toMap(
            payment -> payment.getRegistration().getId(), payment -> payment));
    return found.stream()
        .map(item -> toResponse(item, paymentByRegistration.get(item.getId())))
        .toList();
  }

  @Transactional
  public SuspensionRegistrationResponse create(SuspensionRegistrationRequest request) {
    if (request == null || request.courseId() == null || request.studentId() == null) {
      throw badRequest("Indique o curso e o código do estudante");
    }
    LocalDate date = request.suspensionDate() == null ? SystemDate.today() : request.suspensionDate();
    if (date.isAfter(SystemDate.today())) {
      throw badRequest("A data de trancamento não pode ser futura");
    }
    BigDecimal amount = suspensionSettings.activeFee();
    if (amount == null || amount.signum() <= 0) {
      throw badRequest("Configure uma taxa de trancamento válida antes de registar trancamentos");
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
    if (registrations.existsByStudentId(student.getId())) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "O estudante já tem um trancamento registado");
    }

    SuspensionRegistration registration = new SuspensionRegistration();
    registration.setStudent(student);
    registration.setCourse(course);
    registration.setAmount(amount);
    registration.setSuspensionDate(date);
    return toResponse(registrations.save(registration), null);
  }

  @Transactional
  public SuspensionRegistrationResponse pay(
      Long registrationId, SuspensionRegistrationPaymentRequest request) {
    if (request == null || request.paymentDate() == null
        || request.method() == null || request.method().isBlank()) {
      throw badRequest("Indique a data e o método de pagamento");
    }
    SuspensionRegistration registration = findForUpdate(registrationId);
    if (registration.isPaid()) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "O pagamento deste trancamento já foi registado");
    }
    PaymentMethod method = paymentMethods.findByNameIgnoreCase(request.method().trim())
        .filter(PaymentMethod::isActive)
        .orElseThrow(() -> badRequest("O método de pagamento não existe ou está inativo"));

    SuspensionRegistrationPayment payment = new SuspensionRegistrationPayment();
    payment.setRegistration(registration);
    payment.setAmount(registration.getAmount());
    payment.setPaymentDate(request.paymentDate());
    payment.setMethod(method.getName());
    payment.setReference(request.reference() == null ? null : request.reference().trim());
    payments.save(payment);
    registration.setPaid(true);
    return toResponse(registrations.save(registration), payment);
  }

  @Transactional
  public SuspensionRegistrationResponse suspend(Long registrationId) {
    SuspensionRegistration registration = findForUpdate(registrationId);
    if (!registration.isPaid()) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "O trancamento só pode ser concluído depois de pago");
    }
    if (registration.isSuspended()) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Este estudante já está trancado");
    }
    registration.setSuspended(true);
    SuspensionRegistrationPayment payment = payments.findAllByRegistrationId(registration.getId())
        .stream().findFirst().orElse(null);
    return toResponse(registrations.save(registration), payment);
  }

  private SuspensionRegistration findForUpdate(Long id) {
    return registrations.findByIdForUpdate(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O trancamento não foi encontrado"));
  }

  private SuspensionRegistrationResponse toResponse(
      SuspensionRegistration registration, SuspensionRegistrationPayment payment) {
    Student student = registration.getStudent();
    Course course = registration.getCourse();
    String name = Stream.of(student.getFirstName(), student.getSurname())
        .filter(value -> value != null && !value.isBlank())
        .collect(Collectors.joining(" "));
    String status = registration.isSuspended()
        ? "SUSPENDED"
        : registration.isPaid() ? "PAID" : "PAYMENT_PENDING";
    return new SuspensionRegistrationResponse(
        registration.getId(),
        StudentCodes.of(student),
        name,
        course.getId(),
        course.getName(),
        course.getCategory().getId(),
        course.getCategory().getName(),
        course.getLevel().getId(),
        course.getLevel().getName(),
        course.getModality().getId(),
        course.getModality().getName(),
        course.getDurationMonths(),
        registration.getAmount(),
        registration.getSuspensionDate(),
        registration.isPaid(),
        registration.isSuspended(),
        status,
        payment == null ? null : new SuspensionRegistrationPaymentResponse(
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
