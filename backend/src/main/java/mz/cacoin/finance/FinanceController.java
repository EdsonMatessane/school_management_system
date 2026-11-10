package mz.cacoin.finance;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/finance")
@RequiredArgsConstructor
public class FinanceController {
  private final FinanceService finance;

  @GetMapping("/employees")
  public List<FinanceEmployeeResponse> employees() {
    return finance.employees();
  }

  @GetMapping("/registrations")
  public List<SalaryRegistrationResponse> registrations() {
    return finance.listRegistrations();
  }

  @PostMapping("/registrations")
  @ResponseStatus(HttpStatus.CREATED)
  public SalaryRegistrationResponse createRegistration(
      @RequestBody SalaryRegistrationRequest request) {
    return finance.createRegistration(request);
  }

  @PutMapping("/registrations/{id}")
  public SalaryRegistrationResponse updateRegistration(
      @PathVariable Long id, @RequestBody SalaryRegistrationRequest request) {
    return finance.updateRegistration(id, request);
  }

  @DeleteMapping("/registrations/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteRegistration(@PathVariable Long id) {
    finance.deleteRegistration(id);
  }

  @GetMapping("/payments")
  public List<SalaryPaymentResponse> payments(@RequestParam(required = false) String kind) {
    return finance.listPayments(kind);
  }

  @PostMapping("/payments/processing")
  @ResponseStatus(HttpStatus.CREATED)
  public SalaryPaymentResponse process(@RequestBody SalaryPaymentRequest request) {
    return finance.process(request);
  }

  @PostMapping("/payments/{id}/confirmation")
  public SalaryPaymentResponse confirmReceipt(@PathVariable Long id) {
    return finance.confirmReceipt(id);
  }

  @PostMapping("/payments/advance")
  @ResponseStatus(HttpStatus.CREATED)
  public SalaryPaymentResponse advance(@RequestBody SalaryPaymentRequest request) {
    return finance.advance(request);
  }

  @PostMapping("/payments/liquidation")
  @ResponseStatus(HttpStatus.CREATED)
  public SalaryPaymentResponse liquidate(@RequestBody SalaryPaymentRequest request) {
    return finance.liquidate(request);
  }

  @GetMapping("/pending")
  public List<SalaryRegistrationResponse> pending() {
    return finance.pending();
  }

  @GetMapping("/debts")
  public List<SalaryDebtResponse> debts() {
    return finance.debts();
  }

  @GetMapping("/dashboard")
  public FinanceDashboardResponse dashboard() {
    return finance.dashboard();
  }

  @GetMapping("/reports")
  public List<FinanceReportRowResponse> report(
      @RequestParam(required = false) Integer year,
      @RequestParam(required = false) Long staffId) {
    return finance.report(year, staffId);
  }
}
