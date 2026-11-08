package mz.cacoin.mobilemoney;

import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import mz.cacoin.attendances.AttendanceJustificationPaymentRequest;
import mz.cacoin.attendances.AttendanceService;
import mz.cacoin.exams.ExamRegistrationPaymentRequest;
import mz.cacoin.exams.ExamRegistrationService;
import mz.cacoin.graduations.GraduationRegistrationPaymentRequest;
import mz.cacoin.graduations.GraduationRegistrationService;
import mz.cacoin.payments.methods.PaymentMethod;
import mz.cacoin.payments.methods.PaymentMethodRepository;
import mz.cacoin.settings.SystemDate;
import mz.cacoin.students.StudentFeePaymentRequest;
import mz.cacoin.students.StudentFeeService;
import mz.cacoin.suspensions.SuspensionRegistrationPaymentRequest;
import mz.cacoin.suspensions.SuspensionRegistrationService;
import mz.cacoin.tests.TestRegistrationPaymentRequest;
import mz.cacoin.tests.TestRegistrationService;
import mz.cacoin.uniforms.UniformOrderPaymentRequest;
import mz.cacoin.uniforms.UniformOrderService;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class MobileMoneyRecorder {
  private final PaymentMethodRepository paymentMethods;
  private final StudentFeeService fees;
  private final TestRegistrationService tests;
  private final ExamRegistrationService exams;
  private final UniformOrderService uniforms;
  private final GraduationRegistrationService graduations;
  private final SuspensionRegistrationService suspensions;
  private final AttendanceService attendances;

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public void record(MobileMoneyTransaction transaction) {
    String method = ensureMethod(MobileMoneyWallet.valueOf(transaction.getWallet()).label());
    LocalDate date = SystemDate.today();
    String reference = transaction.getReference();
    BigDecimal amount = transaction.getAmount();
    Long id = transaction.getItemId();
    switch (MobileMoneyKind.valueOf(transaction.getKind())) {
      case INSCRICAO, MENSALIDADE ->
          fees.recordPayment(id, new StudentFeePaymentRequest(amount, date, method, reference));
      case TESTE ->
          tests.recordPayment(id, new TestRegistrationPaymentRequest(amount, date, method, reference));
      case EXAME ->
          exams.recordPayment(id, new ExamRegistrationPaymentRequest(amount, date, method, reference));
      case UNIFORME ->
          uniforms.pay(id, new UniformOrderPaymentRequest(date, method, reference));
      case GRADUACAO ->
          graduations.pay(id, new GraduationRegistrationPaymentRequest(date, method, reference));
      case TRANCAMENTO ->
          suspensions.pay(id, new SuspensionRegistrationPaymentRequest(date, method, reference));
      case PRESENCA ->
          attendances.payJustification(
              id, new AttendanceJustificationPaymentRequest(date, method, reference));
    }
  }

  private String ensureMethod(String name) {
    PaymentMethod method = paymentMethods.findByNameIgnoreCase(name).orElseGet(() -> {
      PaymentMethod created = new PaymentMethod();
      created.setName(name);
      created.setDescription("Mobile Money");
      return created;
    });
    method.setActive(true);
    return paymentMethods.save(method).getName();
  }
}
