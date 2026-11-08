package mz.cacoin.uniforms;

import mz.cacoin.settings.SystemDate;
import mz.cacoin.common.StudentCodes;
import java.math.BigDecimal;
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
public class UniformOrderService {
  private final UniformOrderRepository orders;
  private final UniformOrderPaymentRepository payments;
  private final StudentRepository students;
  private final StudentEnrollmentRepository enrollments;
  private final CourseRepository courses;
  private final PaymentMethodRepository paymentMethods;
  private final UniformSettingsService uniformSettings;
  private final UniformStockService uniformStock;

  @Transactional(readOnly = true)
  public List<UniformOrderResponse> list() {
    List<UniformOrder> found = orders.findAllByOrderByCreatedAtDescIdDesc();
    if (found.isEmpty()) {
      return List.of();
    }
    Map<Long, UniformOrderPayment> paymentByOrder = payments
        .findAllByOrderIdIn(found.stream().map(UniformOrder::getId).toList()).stream()
        .collect(Collectors.toMap(payment -> payment.getOrder().getId(), payment -> payment));
    return found.stream()
        .map(order -> toResponse(order, paymentByOrder.get(order.getId())))
        .toList();
  }

  @Transactional
  public UniformOrderResponse create(UniformOrderRequest request) {
    if (request == null || request.courseId() == null || request.studentId() == null) {
      throw badRequest("Indique o curso, o código do estudante e o tamanho");
    }
    String size = UniformSizes.normalize(request.size());
    if (size == null) {
      throw badRequest("Selecione um tamanho válido");
    }
    BigDecimal amount = uniformSettings.activeFee();
    if (amount == null || amount.signum() <= 0) {
      throw badRequest("Configure uma taxa de uniforme válida antes de requisitar uniformes");
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
    if (orders.existsByStudentId(student.getId())) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "O estudante já requisitou um uniforme");
    }

    UniformOrder order = new UniformOrder();
    order.setStudent(student);
    order.setCourse(course);
    order.setSize(size);
    order.setAmount(amount);
    UniformStockAvailability availability = uniformStock.reserveIfAvailable(size);
    order.setStockReserved(availability == UniformStockAvailability.IN_STOCK);
    order.setObservation(observationFor(availability, size));
    return toResponse(orders.save(order), null);
  }

  @Transactional
  public UniformOrderResponse pay(Long orderId, UniformOrderPaymentRequest request) {
    if (request == null || request.paymentDate() == null
        || request.method() == null || request.method().isBlank()) {
      throw badRequest("Indique a data e o método de pagamento");
    }
    UniformOrder order = findForUpdate(orderId);
    if (order.isPaid()) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "O pagamento deste uniforme já foi registado");
    }
    PaymentMethod method = paymentMethods.findByNameIgnoreCase(request.method().trim())
        .filter(PaymentMethod::isActive)
        .orElseThrow(() -> badRequest("O método de pagamento não existe ou está inativo"));

    UniformOrderPayment payment = new UniformOrderPayment();
    payment.setOrder(order);
    payment.setAmount(order.getAmount());
    payment.setPaymentDate(request.paymentDate());
    payment.setMethod(method.getName());
    payment.setReference(request.reference() == null ? null : request.reference().trim());
    payments.save(payment);
    order.setPaid(true);
    return toResponse(orders.save(order), payment);
  }

  @Transactional
  public UniformOrderResponse deliver(Long orderId) {
    UniformOrder order = findForUpdate(orderId);
    if (!order.isPaid()) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "O uniforme só pode ser entregue depois de pago");
    }
    if (order.isDelivered()) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Este uniforme já foi entregue");
    }
    if (!order.isStockReserved()) {
      UniformStockAvailability availability = uniformStock.reserveIfAvailable(order.getSize());
      if (availability != UniformStockAvailability.IN_STOCK) {
        throw new ResponseStatusException(
            HttpStatus.CONFLICT,
            "Não há stock do tamanho " + order.getSize() + "; registe uma entrada de stock");
      }
      order.setStockReserved(true);
      order.setObservation(UniformSizes.OBSERVATION_OK);
    }
    order.setDelivered(true);
    order.setDeliveryDate(SystemDate.today());
    UniformOrderPayment payment = payments.findAllByOrderId(order.getId()).stream()
        .findFirst().orElse(null);
    return toResponse(orders.save(order), payment);
  }

  private String observationFor(UniformStockAvailability availability, String size) {
    return switch (availability) {
      case IN_STOCK -> UniformSizes.OBSERVATION_OK;
      case OUT_OF_STOCK -> UniformSizes.OBSERVATION_NO_STOCK;
      case SIZE_MISSING -> UniformSizes.missingSizeObservation(size);
    };
  }

  private UniformOrder findForUpdate(Long id) {
    return orders.findByIdForUpdate(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O pedido de uniforme não foi encontrado"));
  }

  private UniformOrderResponse toResponse(UniformOrder order, UniformOrderPayment payment) {
    Student student = order.getStudent();
    Course course = order.getCourse();
    String name = Stream.of(student.getFirstName(), student.getSurname())
        .filter(value -> value != null && !value.isBlank())
        .collect(Collectors.joining(" "));
    LocalDate orderDate = order.getCreatedAt() == null
        ? SystemDate.today()
        : order.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate();
    String status = order.isDelivered()
        ? "DELIVERED"
        : order.isPaid() ? "DELIVERY_PENDING" : "PAYMENT_PENDING";
    return new UniformOrderResponse(
        order.getId(),
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
        order.getSize(),
        order.getAmount(),
        order.getObservation(),
        order.isPaid(),
        order.isDelivered(),
        status,
        orderDate,
        order.getDeliveryDate(),
        payment == null ? null : new UniformOrderPaymentResponse(
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
