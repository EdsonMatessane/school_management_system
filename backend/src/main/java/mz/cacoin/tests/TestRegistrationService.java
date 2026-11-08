package mz.cacoin.tests;

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
public class TestRegistrationService {
  private static final Set<String> TEST_TYPES = Set.of("NORMAL", "RECOVERY", "SPECIAL");

  private final TestRegistrationRepository registrations;
  private final TestRegistrationPaymentRepository payments;
  private final StudentRepository students;
  private final StudentEnrollmentRepository enrollments;
  private final CourseRepository courses;
  private final PaymentMethodRepository paymentMethods;
  private final TestSettingsService testSettings;

  @Transactional(readOnly = true)
  public List<TestRegistrationResponse> list(String testType) {
    if (testType != null && !TEST_TYPES.contains(testType)) {
      throw badRequest("O tipo de teste indicado não é válido");
    }
    List<TestRegistration> found = registrations.findAllByOrderByCreatedAtDescIdDesc().stream()
        .filter(registration -> testType == null || testType.equals(registration.getTestType()))
        .toList();
    if (found.isEmpty()) return List.of();
    Collection<Long> ids = found.stream().map(TestRegistration::getId).toList();
    Map<Long, List<TestRegistrationPaymentResponse>> paymentHistory =
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
  public TestRegistrationResponse create(TestRegistrationRequest request) {
    if (request == null || request.courseId() == null || request.studentId() == null) {
      throw badRequest("Indique o curso, o código do estudante e o tipo de teste");
    }
    String type = normalizeType(request.testType());
    testSettings.requireTestPeriodOpen();
    // Zero = "Sem taxa de cobrança": a inscrição é criada sem processo de pagamento.
    BigDecimal amount = testSettings.feeFor(type);
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

    TestRegistration registration = new TestRegistration();
    registration.setStudent(student);
    registration.setCourse(course);
    registration.setTestType(type);
    registration.setAmount(amount);
    return toResponse(registrations.save(registration));
  }

  @Transactional
  public TestRegistrationResponse recordPayment(
      Long registrationId, TestRegistrationPaymentRequest request) {
    if (request == null || request.paymentDate() == null
        || request.method() == null || request.method().isBlank()) {
      throw badRequest("Indique o valor, a data e o método de pagamento");
    }
    BigDecimal amount = validateAmount(request.amount());
    TestRegistration registration = registrations.findByIdForUpdate(registrationId)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "A inscrição do teste não foi encontrada"));
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

    TestRegistrationPayment payment = new TestRegistrationPayment();
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

  private TestRegistrationResponse toResponse(TestRegistration registration) {
    List<TestRegistrationPaymentResponse> history = payments
        .findAllByRegistrationIdOrderByPaymentDateAscIdAsc(registration.getId())
        .stream()
        .map(this::toPaymentResponse)
        .toList();
    return toResponse(registration, history);
  }

  private TestRegistrationResponse toResponse(
      TestRegistration registration, List<TestRegistrationPaymentResponse> history) {
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
    return new TestRegistrationResponse(
        registration.getId(),
        registration.getTestType(),
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

  private TestRegistrationPaymentResponse toPaymentResponse(TestRegistrationPayment payment) {
    return new TestRegistrationPaymentResponse(
        payment.getId(),
        payment.getAmount(),
        payment.getPaymentDate(),
        payment.getMethod(),
        payment.getReference());
  }

  private String normalizeType(String type) {
    if (type == null || !TEST_TYPES.contains(type.trim().toUpperCase(Locale.ROOT))) {
      throw badRequest("Selecione um tipo de teste válido");
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
