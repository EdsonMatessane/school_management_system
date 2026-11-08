package mz.cacoin.uniforms;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
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

class UniformOrderServiceTest {
  private UniformOrderRepository orders;
  private UniformOrderPaymentRepository payments;
  private StudentRepository students;
  private StudentEnrollmentRepository enrollments;
  private CourseRepository courses;
  private PaymentMethodRepository paymentMethods;
  private UniformSettingsService uniformSettings;
  private UniformStockService uniformStock;
  private UniformOrderService service;
  private Student student;
  private Course course;

  @BeforeEach
  void setUp() {
    orders = mock(UniformOrderRepository.class);
    payments = mock(UniformOrderPaymentRepository.class);
    students = mock(StudentRepository.class);
    enrollments = mock(StudentEnrollmentRepository.class);
    courses = mock(CourseRepository.class);
    paymentMethods = mock(PaymentMethodRepository.class);
    uniformSettings = mock(UniformSettingsService.class);
    uniformStock = mock(UniformStockService.class);
    service = new UniformOrderService(
        orders, payments, students, enrollments, courses, paymentMethods,
        uniformSettings, uniformStock);

    student = new Student();
    student.setId(7L);
    student.setStudentYear(2026);
    student.setStudentNumber(7);
    student.setFirstName("Ana");
    student.setSurname("Matsinhe");
    course = newCourse(3L);
    when(students.findById(7L)).thenReturn(Optional.of(student));
    when(courses.findById(3L)).thenReturn(Optional.of(course));
    when(uniformSettings.activeFee()).thenReturn(new BigDecimal("750.00"));
    when(orders.save(any(UniformOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));
    when(payments.save(any(UniformOrderPayment.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    StudentEnrollment enrollment = new StudentEnrollment();
    enrollment.setStudent(student);
    enrollment.setCourse(course);
    when(enrollments.findFirstByStudentIdOrderByCreatedAtDescIdDesc(7L))
        .thenReturn(Optional.of(enrollment));
  }

  @Test
  void orderWithAvailableStockIsMarkedOkAndUsesTheConfiguredFee() {
    when(uniformStock.reserveIfAvailable("M")).thenReturn(UniformStockAvailability.IN_STOCK);

    UniformOrderResponse response = service.create(new UniformOrderRequest(7L, 3L, "m"));

    assertEquals("M", response.size());
    assertEquals(new BigDecimal("750.00"), response.amount());
    assertEquals("-", response.observation());
    assertEquals("PAYMENT_PENDING", response.status());
    assertEquals("CACOIN202607", response.studentCode());
  }

  @Test
  void orderForSizeWithoutStockGetsTheNoStockObservation() {
    when(uniformStock.reserveIfAvailable("L")).thenReturn(UniformStockAvailability.OUT_OF_STOCK);

    assertEquals("Sem stock",
        service.create(new UniformOrderRequest(7L, 3L, "L")).observation());
  }

  @Test
  void orderForUnregisteredSizeGetsTheMissingSizeObservation() {
    when(uniformStock.reserveIfAvailable("XXXL")).thenReturn(UniformStockAvailability.SIZE_MISSING);

    assertEquals("Falta de tamanho XXXL",
        service.create(new UniformOrderRequest(7L, 3L, "XXXL")).observation());
  }

  @Test
  void createRejectsInvalidSizeMissingFeeAndDuplicates() {
    assertEquals(400, assertThrows(ResponseStatusException.class,
        () -> service.create(new UniformOrderRequest(7L, 3L, "XXXXL"))).getStatusCode().value());

    when(uniformSettings.activeFee()).thenReturn(BigDecimal.ZERO);
    assertEquals(400, assertThrows(ResponseStatusException.class,
        () -> service.create(new UniformOrderRequest(7L, 3L, "M"))).getStatusCode().value());

    when(uniformSettings.activeFee()).thenReturn(new BigDecimal("750.00"));
    when(orders.existsByStudentId(7L)).thenReturn(true);
    assertEquals(409, assertThrows(ResponseStatusException.class,
        () -> service.create(new UniformOrderRequest(7L, 3L, "M"))).getStatusCode().value());
    verify(orders, never()).save(any(UniformOrder.class));
  }

  @Test
  void createRejectsStudentNotEnrolledInTheSelectedCourse() {
    Course other = newCourse(99L);
    when(courses.findById(99L)).thenReturn(Optional.of(other));

    assertEquals(400, assertThrows(ResponseStatusException.class,
        () -> service.create(new UniformOrderRequest(7L, 99L, "M"))).getStatusCode().value());
    verify(orders, never()).save(any(UniformOrder.class));
  }

  @Test
  void payingRecordsThePaymentForTheFullFee() {
    UniformOrder order = order(false, false, true);
    when(orders.findByIdForUpdate(1L)).thenReturn(Optional.of(order));
    PaymentMethod method = new PaymentMethod();
    method.setName("Numerário");
    when(paymentMethods.findByNameIgnoreCase("Numerário")).thenReturn(Optional.of(method));

    UniformOrderResponse response = service.pay(
        1L, new UniformOrderPaymentRequest(LocalDate.of(2026, 10, 19), "Numerário", null));

    assertTrue(order.isPaid());
    assertEquals("DELIVERY_PENDING", response.status());
    assertEquals(new BigDecimal("750.00"), response.payment().amount());
  }

  @Test
  void payingTwiceIsRejected() {
    when(orders.findByIdForUpdate(1L)).thenReturn(Optional.of(order(true, false, true)));

    assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.pay(
        1L, new UniformOrderPaymentRequest(LocalDate.now(), "Numerário", null)))
        .getStatusCode().value());
    verify(payments, never()).save(any(UniformOrderPayment.class));
  }

  @Test
  void deliveryRequiresPayment() {
    when(orders.findByIdForUpdate(1L)).thenReturn(Optional.of(order(false, false, true)));

    assertEquals(409, assertThrows(ResponseStatusException.class,
        () -> service.deliver(1L)).getStatusCode().value());
  }

  @Test
  void deliveryOfAReservedUniformDoesNotTouchStock() {
    UniformOrder order = order(true, false, true);
    when(orders.findByIdForUpdate(1L)).thenReturn(Optional.of(order));

    UniformOrderResponse response = service.deliver(1L);

    assertTrue(order.isDelivered());
    assertEquals("DELIVERED", response.status());
    verify(uniformStock, never()).reserveIfAvailable(anyString());
  }

  @Test
  void deliveryWithoutReservedStockTakesFromNewStockOrFails() {
    UniformOrder order = order(true, false, false);
    order.setObservation("Sem stock");
    when(orders.findByIdForUpdate(1L)).thenReturn(Optional.of(order));
    when(uniformStock.reserveIfAvailable("M"))
        .thenReturn(UniformStockAvailability.OUT_OF_STOCK, UniformStockAvailability.IN_STOCK);

    assertEquals(409, assertThrows(ResponseStatusException.class,
        () -> service.deliver(1L)).getStatusCode().value());
    assertFalse(order.isDelivered());

    UniformOrderResponse response = service.deliver(1L);

    assertTrue(order.isDelivered());
    assertEquals("-", response.observation());
  }

  private UniformOrder order(boolean paid, boolean delivered, boolean stockReserved) {
    UniformOrder order = new UniformOrder();
    order.setId(1L);
    order.setStudent(student);
    order.setCourse(course);
    order.setSize("M");
    order.setAmount(new BigDecimal("750.00"));
    order.setObservation("-");
    order.setPaid(paid);
    order.setDelivered(delivered);
    order.setStockReserved(stockReserved);
    return order;
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
