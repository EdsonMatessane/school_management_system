package mz.cacoin.exams;

import mz.cacoin.settings.SystemDate;
import mz.cacoin.common.StudentCodes;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
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
public class ExamRegistrationService {
  private static final Set<String> EXAM_TYPES = Set.of("NORMAL", "RECURRENCE", "SPECIAL");

  private final ExamRegistrationRepository registrations;
  private final ExamRegistrationPaymentRepository payments;
  private final StudentRepository students;
  private final StudentEnrollmentRepository enrollments;
  private final CourseRepository courses;
  private final PaymentMethodRepository paymentMethods;
  private final ExamSettingsService examSettings;

  @Transactional(readOnly = true)
  public List<ExamRegistrationResponse> list(String examType) {
    if (examType != null && !EXAM_TYPES.contains(examType)) {
      throw badRequest("O tipo de exame indicado não é válido");
    }
    List<ExamRegistration> found = registrations.findAllByOrderByCreatedAtDescIdDesc().stream()
        .filter(registration -> examType == null || examType.equals(registration.getExamType()))
        .toList();
    if (found.isEmpty()) return List.of();
    Collection<Long> ids = found.stream().map(ExamRegistration::getId).toList();
    Map<Long, List<ExamRegistrationPaymentResponse>> paymentHistory =
        payments.findAllByRegistrationIdInOrderByPaymentDateAscIdAsc(ids).stream()
            .collect(Collectors.groupingBy(
                payment -> payment.getRegistration().getId(),
                Collectors.mapping(this::toPaymentResponse, Collectors.toList())));
    return found.stream()
        .map(registration -> toResponse(
            registration, paymentHistory.getOrDefault(registration.getId(), List.of())))
        .toList();
  }

  @Transactional
  public ExamRegistrationResponse create(ExamRegistrationRequest request) {
    if (request == null || request.courseId() == null || request.studentId() == null) {
      throw badRequest("Indique o curso, o código do estudante e o tipo de exame");
    }
    String type = normalizeType(request.examType());
    examSettings.requireExamPeriodOpen();
    // Zero = "Sem taxa de cobrança": a inscrição é criada sem processo de pagamento.
    BigDecimal amount = examSettings.feeFor(type);
    Student student = students.findById(request.studentId())
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O estudante não foi encontrado"));
    if (!student.isActive()) throw badRequest("O estudante selecionado está inativo");
    Course course = courses.findById(request.courseId())
        .filter(Course::isActive)
        .orElseThrow(() -> badRequest("O curso selecionado não existe ou está inativo"));
    Long enrolledCourseId = enrollments
        .findFirstByStudentIdOrderByCreatedAtDescIdDesc(student.getId())
        .map(enrollment -> enrollment.getCourse().getId())
        .orElse(null);
    if (!course.getId().equals(enrolledCourseId)) {
      throw badRequest("O estudante não está inscrito no curso seleccionado");
    }

    ExamRegistration registration = new ExamRegistration();
    registration.setStudent(student);
    registration.setCourse(course);
    registration.setExamType(type);
    registration.setAmount(amount);
    return toResponse(registrations.save(registration));
  }

  @Transactional
  public ExamRegistrationResponse recordPayment(
      Long registrationId, ExamRegistrationPaymentRequest request) {
    if (request == null || request.paymentDate() == null
        || request.method() == null || request.method().isBlank()) {
      throw badRequest("Indique o valor, a data e o método de pagamento");
    }
    BigDecimal amount = validateAmount(request.amount());
    ExamRegistration registration = registrations.findByIdForUpdate(registrationId)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "A inscrição do exame não foi encontrada"));
    if (registration.getAmount().signum() <= 0) {
      throw badRequest("Esta inscrição não tem taxa de cobrança");
    }
    BigDecimal balance = registration.getAmount().subtract(registration.getPaidAmount());
    if (amount.compareTo(balance) > 0) {
      throw badRequest("O valor do pagamento não pode exceder o saldo pendente");
    }
    PaymentMethod method = paymentMethods.findByNameIgnoreCase(request.method().trim())
        .filter(PaymentMethod::isActive)
        .orElseThrow(() -> badRequest("O método de pagamento não existe ou está inativo"));

    ExamRegistrationPayment payment = new ExamRegistrationPayment();
    payment.setRegistration(registration);
    payment.setAmount(amount);
    payment.setPaymentDate(request.paymentDate());
    payment.setMethod(method.getName());
    payment.setReference(request.reference() == null ? null : request.reference().trim());
    payments.save(payment);
    registration.setPaidAmount(registration.getPaidAmount().add(amount));
    registrations.save(registration);
    return toResponse(registration);
  }

  private ExamRegistrationResponse toResponse(ExamRegistration registration) {
    List<ExamRegistrationPaymentResponse> history = payments
        .findAllByRegistrationIdOrderByPaymentDateAscIdAsc(registration.getId())
        .stream()
        .map(this::toPaymentResponse)
        .toList();
    return toResponse(registration, history);
  }

  private ExamRegistrationResponse toResponse(
      ExamRegistration registration, List<ExamRegistrationPaymentResponse> history) {
    Student student = registration.getStudent();
    Course course = registration.getCourse();
    BigDecimal balance = registration.getAmount().subtract(registration.getPaidAmount())
        .max(BigDecimal.ZERO);
    String name = java.util.stream.Stream.of(student.getFirstName(), student.getSurname())
        .filter(value -> value != null && !value.isBlank())
        .collect(java.util.stream.Collectors.joining(" "));
    LocalDate date = registration.getCreatedAt() == null
        ? SystemDate.today()
        : registration.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate();
    return new ExamRegistrationResponse(
        registration.getId(),
        registration.getExamType(),
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
        registration.getAmount(),
        registration.getPaidAmount(),
        balance,
        registration.getAmount().signum() <= 0 ? "FREE"
            : balance.signum() == 0 ? "PAID" : "PENDING",
        date,
        history);
  }

  private ExamRegistrationPaymentResponse toPaymentResponse(ExamRegistrationPayment payment) {
    return new ExamRegistrationPaymentResponse(
        payment.getId(),
        payment.getAmount(),
        payment.getPaymentDate(),
        payment.getMethod(),
        payment.getReference());
  }

  private String normalizeType(String type) {
    if (type == null || !EXAM_TYPES.contains(type.trim().toUpperCase(Locale.ROOT))) {
      throw badRequest("Selecione um tipo de exame válido");
    }
    return type.trim().toUpperCase(Locale.ROOT);
  }

  private BigDecimal validateAmount(BigDecimal amount) {
    if (amount == null || amount.signum() <= 0 || amount.scale() > 2
        || amount.precision() > 12) {
      throw badRequest("Indique um valor superior a zero com até duas casas decimais");
    }
    return amount;
  }

  private ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
