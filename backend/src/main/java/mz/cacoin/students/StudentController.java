package mz.cacoin.students;

import lombok.RequiredArgsConstructor;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/students")
@RequiredArgsConstructor
public class StudentController {
  private final StudentService students;

  @GetMapping
  public List<StudentManagementResponse> list() {
    return students.list();
  }

  @GetMapping("/charges")
  public List<StudentFeeChargeResponse> listCharges(@RequestParam String feeType) {
    return students.listCharges(feeType);
  }

  @GetMapping("/enrollment-payments")
  public List<StudentEnrollmentPaymentResponse> listEnrollmentPayments(
      @RequestParam(required = false) String status) {
    return students.listEnrollmentPayments(status);
  }

  @PostMapping("/{studentId}/charges")
  @ResponseStatus(HttpStatus.CREATED)
  public StudentFeeChargeResponse createCharge(
      @PathVariable Long studentId, @RequestBody StudentFeeChargeRequest request) {
    return students.createCharge(studentId, request);
  }

  @PostMapping("/charges/{chargeId}/payments")
  @ResponseStatus(HttpStatus.CREATED)
  public StudentFeePaymentResponse recordPayment(
      @PathVariable Long chargeId, @RequestBody StudentFeePaymentRequest request) {
    return students.recordPayment(chargeId, request);
  }

  @PostMapping("/charges/payments/batch")
  @ResponseStatus(HttpStatus.CREATED)
  public List<StudentFeePaymentResponse> recordBatchPayment(
      @RequestBody StudentFeeBatchPaymentRequest request) {
    return students.recordBatchPayment(request);
  }

  @PostMapping("/enrollments")
  @ResponseStatus(HttpStatus.CREATED)
  public StudentEnrollmentResponse enroll(@RequestBody StudentEnrollmentRequest request) {
    return students.enroll(request);
  }

  @PutMapping("/{id}")
  public StudentEnrollmentResponse update(
      @PathVariable Long id, @RequestBody StudentEnrollmentRequest request) {
    return students.update(id, request);
  }

  @PatchMapping("/{id}/activation")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void setActive(@PathVariable Long id, @RequestBody StudentActivationRequest request) {
    if (request == null || request.active() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O estado de ativação é obrigatório");
    }
    students.setActive(id, request.active());
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Long id) {
    students.delete(id);
  }
}
