package mz.cacoin.graduations;

import mz.cacoin.settings.SystemDate;
import mz.cacoin.common.StudentCodes;
import java.time.LocalDate;
import java.time.ZoneId;
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
public class GraduationRegistrationService {
  private final GraduationRegistrationRepository registrations;
  private final GraduationRegistrationPaymentRepository payments;
  private final GraduateRepository graduates;
  private final StudentRepository students;
  private final StudentEnrollmentRepository enrollments;
  private final CourseRepository courses;
  private final PaymentMethodRepository paymentMethods;
  private final GraduationSettingsService graduationSettings;

  @Transactional(readOnly = true)
  public List<GraduationRegistrationResponse> list() {
    List<GraduationRegistration> found = registrations.findAllByOrderByCreatedAtDescIdDesc();
    if (found.isEmpty()) {
      return List.of();
    }
    Map<Long, GraduationRegistrationPayment> paymentByRegistration = payments
        .findAllByRegistrationIdIn(found.stream().map(GraduationRegistration::getId).toList())
        .stream()
        .collect(Collectors.toMap(
            payment -> payment.getRegistration().getId(), payment -> payment));
    return found.stream()
        .map(item -> toResponse(item, paymentByRegistration.get(item.getId())))
        .toList();
  }

  @Transactional
  public GraduationRegistrationResponse create(GraduationRegistrationRequest request) {
    if (request == null || request.courseId() == null || request.studentId() == null) {
      throw badRequest("Indique o curso, o código do estudante e os convidados");
    }
    int guests = request.guests() == null ? 0 : request.guests();
    if (guests < 0 || guests > GraduationSettingsService.MAX_GUESTS) {
      throw badRequest("O número de convidados deve estar entre 0 e "
          + GraduationSettingsService.MAX_GUESTS);
    }
    graduationSettings.requireRegistrationPeriodOpen();
    GraduationQuote quote = graduationSettings.quote(guests);
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
          HttpStatus.CONFLICT, "O estudante já está inscrito na graduação");
    }

    GraduationRegistration registration = new GraduationRegistration();
    registration.setStudent(student);
    registration.setCourse(course);
    registration.setGuests(guests);
    registration.setFeeAmount(quote.feeAmount());
    registration.setRequirementsAmount(quote.requirementsAmount());
    registration.setExtraGuestsAmount(quote.extraGuestsAmount());
    registration.setAmount(quote.total());
    return toResponse(registrations.save(registration), null);
  }

  @Transactional
  public GraduationRegistrationResponse pay(
      Long registrationId, GraduationRegistrationPaymentRequest request) {
    if (request == null || request.paymentDate() == null
        || request.method() == null || request.method().isBlank()) {
      throw badRequest("Indique a data e o método de pagamento");
    }
    GraduationRegistration registration = findForUpdate(registrationId);
    if (registration.isPaid()) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "O pagamento desta inscrição já foi registado");
    }
    PaymentMethod method = paymentMethods.findByNameIgnoreCase(request.method().trim())
        .filter(PaymentMethod::isActive)
        .orElseThrow(() -> badRequest("O método de pagamento não existe ou está inativo"));

    GraduationRegistrationPayment payment = new GraduationRegistrationPayment();
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
  public GraduationRegistrationResponse graduate(Long registrationId) {
    GraduationRegistration registration = findForUpdate(registrationId);
    if (!registration.isPaid()) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "O estudante só pode ser graduado depois de pagar a inscrição");
    }
    if (registration.isGraduated()) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Este estudante já foi graduado");
    }
    LocalDate today = SystemDate.today();
    registration.setGraduated(true);
    registration.setGraduationDate(today);
    GraduationRegistration saved = registrations.save(registration);

    Graduate graduate = graduates.findByStudentId(registration.getStudent().getId())
        .orElseGet(Graduate::new);
    graduate.setStudent(registration.getStudent());
    graduate.setCourse(registration.getCourse());
    graduate.setRegistration(saved);
    graduate.setGraduationDate(today);
    graduates.save(graduate);

    GraduationRegistrationPayment payment = payments.findAllByRegistrationId(saved.getId())
        .stream().findFirst().orElse(null);
    return toResponse(saved, payment);
  }

  private GraduationRegistration findForUpdate(Long id) {
    return registrations.findByIdForUpdate(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "A inscrição na graduação não foi encontrada"));
  }

  private GraduationRegistrationResponse toResponse(
      GraduationRegistration registration, GraduationRegistrationPayment payment) {
    Student student = registration.getStudent();
    Course course = registration.getCourse();
    String name = Stream.of(student.getFirstName(), student.getSurname())
        .filter(value -> value != null && !value.isBlank())
        .collect(Collectors.joining(" "));
    LocalDate registrationDate = registration.getCreatedAt() == null
        ? SystemDate.today()
        : registration.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate();
    String status = registration.isGraduated()
        ? "GRADUATED"
        : registration.isPaid() ? "ENROLLED" : "PAYMENT_PENDING";
    return new GraduationRegistrationResponse(
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
        registration.getGuests(),
        registration.getFeeAmount(),
        registration.getRequirementsAmount(),
        registration.getExtraGuestsAmount(),
        registration.getAmount(),
        registration.isPaid(),
        registration.isGraduated(),
        status,
        registrationDate,
        registration.getGraduationDate(),
        payment == null ? null : new GraduationRegistrationPaymentResponse(
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
