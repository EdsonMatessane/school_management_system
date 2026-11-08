package mz.cacoin.payments.methods;

import java.util.List;
import lombok.RequiredArgsConstructor;
import mz.cacoin.attendances.AttendanceJustificationPaymentRepository;
import mz.cacoin.exams.ExamRegistrationPaymentRepository;
import mz.cacoin.graduations.GraduationRegistrationPaymentRepository;
import mz.cacoin.suspensions.SuspensionRegistrationPaymentRepository;
import mz.cacoin.tests.TestRegistrationPaymentRepository;
import mz.cacoin.uniforms.UniformOrderPaymentRepository;
import mz.cacoin.students.StudentFeePaymentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class PaymentMethodService {
  private final PaymentMethodRepository methods;
  private final StudentFeePaymentRepository studentPayments;
  private final TestRegistrationPaymentRepository testRegistrationPayments;
  private final ExamRegistrationPaymentRepository examRegistrationPayments;
  private final UniformOrderPaymentRepository uniformOrderPayments;
  private final GraduationRegistrationPaymentRepository graduationRegistrationPayments;
  private final SuspensionRegistrationPaymentRepository suspensionRegistrationPayments;
  private final AttendanceJustificationPaymentRepository attendanceJustificationPayments;

  @Transactional(readOnly = true)
  public List<PaymentMethodResponse> list() {
    return methods.findAllByOrderByIdAsc().stream().map(this::toResponse).toList();
  }

  @Transactional
  public PaymentMethodResponse create(PaymentMethodRequest request) {
    String name = validateName(request);
    if (methods.existsByNameIgnoreCase(name)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Já existe um método de pagamento com esse nome");
    }
    PaymentMethod method = new PaymentMethod();
    apply(method, request, name);
    return toResponse(methods.save(method));
  }

  @Transactional
  public PaymentMethodResponse update(Long id, PaymentMethodRequest request) {
    PaymentMethod method = findMethod(id);
    String name = validateName(request);
    if (methods.existsByNameIgnoreCaseAndIdNot(name, id)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Já existe um método de pagamento com esse nome");
    }
    String previousName = method.getName();
    apply(method, request, name);
    PaymentMethod saved = methods.save(method);
    if (!previousName.equals(name)) {
      // Os pagamentos já registados guardam o nome do método; mantém-nos coerentes.
      studentPayments.renameMethod(previousName, name);
      testRegistrationPayments.renameMethod(previousName, name);
      examRegistrationPayments.renameMethod(previousName, name);
      uniformOrderPayments.renameMethod(previousName, name);
      graduationRegistrationPayments.renameMethod(previousName, name);
      suspensionRegistrationPayments.renameMethod(previousName, name);
      attendanceJustificationPayments.renameMethod(previousName, name);
    }
    return toResponse(saved);
  }

  @Transactional
  public PaymentMethodResponse setActive(Long id, PaymentMethodActivationRequest request) {
    if (request == null || request.active() == null) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Indique o estado do método de pagamento");
    }
    PaymentMethod method = findMethod(id);
    method.setActive(request.active());
    return toResponse(methods.save(method));
  }

  @Transactional
  public void delete(Long id) {
    PaymentMethod method = findMethod(id);
    if (studentPayments.existsByMethodIgnoreCase(method.getName())
        || testRegistrationPayments.existsByMethodIgnoreCase(method.getName())
        || examRegistrationPayments.existsByMethodIgnoreCase(method.getName())
        || uniformOrderPayments.existsByMethodIgnoreCase(method.getName())
        || graduationRegistrationPayments.existsByMethodIgnoreCase(method.getName())
        || suspensionRegistrationPayments.existsByMethodIgnoreCase(method.getName())
        || attendanceJustificationPayments.existsByMethodIgnoreCase(method.getName())) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Não é possível apagar o método porque já existem pagamentos registados com ele. "
              + "Desative-o em vez de o apagar");
    }
    methods.delete(method);
  }

  private PaymentMethod findMethod(Long id) {
    return methods.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O método de pagamento não foi encontrado"));
  }

  private String validateName(PaymentMethodRequest request) {
    if (request == null || request.name() == null) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Indique um nome para o método de pagamento");
    }
    String name = request.name().trim().replaceAll("\\s+", " ");
    if (name.isEmpty() || name.length() > 120) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "O nome do método de pagamento deve ter entre 1 e 120 caracteres");
    }
    return name;
  }

  private void apply(PaymentMethod method, PaymentMethodRequest request, String name) {
    method.setName(name);
    String description = request.description() == null ? null : request.description().trim();
    if (description != null && description.length() > 500) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "A descrição não pode exceder 500 caracteres");
    }
    method.setDescription(description == null || description.isEmpty() ? null : description);
  }

  private PaymentMethodResponse toResponse(PaymentMethod method) {
    return new PaymentMethodResponse(
        method.getId(), method.getName(), method.getDescription(), method.isActive());
  }
}
