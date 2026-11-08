package mz.cacoin.internalexpenses;

import static mz.cacoin.internalexpenses.InternalExpenseDtos.*;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/internal-expenses")
@RequiredArgsConstructor
public class InternalExpenseController {
  private final InternalExpenseService service;

  @GetMapping("/dashboard")
  public DashboardResponse dashboard() {
    return service.dashboard();
  }

  @GetMapping("/requesters")
  public List<RequesterResponse> requesters() {
    return service.requesters();
  }

  @GetMapping("/settings")
  public ExpenseSettingsResponse settings() {
    return service.getSettings();
  }

  @PutMapping("/settings")
  public ExpenseSettingsResponse updateSettings(@RequestBody ExpenseSettingsRequest request) {
    return service.updateSettings(request);
  }

  @GetMapping("/expenses")
  public List<ExpenseResponse> expenses(
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String query) {
    return service.list(status, query);
  }

  @GetMapping("/expenses/{id}")
  public ExpenseResponse expense(@PathVariable Long id) {
    return service.get(id);
  }

  @PostMapping("/expenses")
  @ResponseStatus(HttpStatus.CREATED)
  public ExpenseResponse createExpense(@RequestBody ExpenseRequest request) {
    return service.create(request);
  }

  @PutMapping("/expenses/{id}")
  public ExpenseResponse updateExpense(
      @PathVariable Long id, @RequestBody ExpenseRequest request) {
    return service.update(id, request);
  }

  @PostMapping("/expenses/{id}/submit")
  public ExpenseResponse submit(
      @PathVariable Long id, @RequestBody(required = false) DecisionRequest request) {
    return service.submit(id, request);
  }

  @PostMapping("/expenses/{id}/decision/{decision}")
  public ExpenseResponse decide(
      @PathVariable Long id,
      @PathVariable String decision,
      @RequestBody DecisionRequest request) {
    return service.decide(id, decision.toUpperCase(), request);
  }

  @PostMapping("/expenses/{id}/cancel")
  public ExpenseResponse cancel(@PathVariable Long id, @RequestBody DecisionRequest request) {
    return service.cancel(id, request);
  }

  @GetMapping("/expenses/{id}/payments")
  public List<PaymentResponse> payments(@PathVariable Long id) {
    return service.listPayments(id);
  }

  @GetMapping("/payments")
  public List<PaymentResponse> allPayments() {
    return service.listAllPayments();
  }

  @PostMapping("/expenses/{id}/payments")
  @ResponseStatus(HttpStatus.CREATED)
  public PaymentResponse createPayment(
      @PathVariable Long id, @RequestBody PaymentRequest request) {
    return service.createPayment(id, request);
  }

  @PostMapping("/payments/{id}/reverse")
  public PaymentResponse reversePayment(
      @PathVariable Long id, @RequestBody DecisionRequest request) {
    return service.reversePayment(id, request);
  }

  @GetMapping("/categories")
  public List<InternalExpenseCategory> categories() {
    return service.categoryList();
  }

  @PostMapping("/categories")
  @ResponseStatus(HttpStatus.CREATED)
  public InternalExpenseCategory createCategory(@RequestBody CategoryRequest request) {
    return service.saveCategory(null, request);
  }

  @PutMapping("/categories/{id}")
  public InternalExpenseCategory updateCategory(
      @PathVariable Long id, @RequestBody CategoryRequest request) {
    return service.saveCategory(id, request);
  }

  @PatchMapping("/categories/{id}/activation")
  public InternalExpenseCategory categoryActivation(
      @PathVariable Long id, @RequestBody ActivationRequest request) {
    return service.categoryActive(id, request.active());
  }

  @GetMapping("/suppliers")
  public List<InternalExpenseSupplier> suppliers() {
    return service.supplierList();
  }

  @PostMapping("/suppliers")
  @ResponseStatus(HttpStatus.CREATED)
  public InternalExpenseSupplier createSupplier(@RequestBody SupplierRequest request) {
    return service.saveSupplier(null, request);
  }

  @PutMapping("/suppliers/{id}")
  public InternalExpenseSupplier updateSupplier(
      @PathVariable Long id, @RequestBody SupplierRequest request) {
    return service.saveSupplier(id, request);
  }

  @PatchMapping("/suppliers/{id}/activation")
  public InternalExpenseSupplier supplierActivation(
      @PathVariable Long id, @RequestBody ActivationRequest request) {
    return service.supplierActive(id, request.active());
  }

  @GetMapping("/budgets")
  public List<BudgetResponse> budgets() {
    return service.budgetList();
  }

  @PostMapping("/budgets")
  @ResponseStatus(HttpStatus.CREATED)
  public InternalExpenseBudget createBudget(@RequestBody BudgetRequest request) {
    return service.saveBudget(null, request);
  }

  @PutMapping("/budgets/{id}")
  public InternalExpenseBudget updateBudget(
      @PathVariable Long id, @RequestBody BudgetRequest request) {
    return service.saveBudget(id, request);
  }

  @GetMapping("/expenses/{id}/audit")
  public List<AuditResponse> audit(@PathVariable Long id) {
    return service.auditList(id);
  }

  public record ActivationRequest(boolean active) {}
}
