package mz.cacoin.expenses;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
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
@RequestMapping("/api/expenses")
@RequiredArgsConstructor
public class ExpensesController {
  private final ExpensesService service;

  @GetMapping("/catalog")
  public List<ExpensesDtos.CatalogResponse> listCatalog(
      @RequestParam(name = "kind", required = false) String kind) {
    return service.listCatalog(kind);
  }

  @PostMapping("/catalog")
  @ResponseStatus(HttpStatus.CREATED)
  public ExpensesDtos.CatalogResponse createCatalog(
      @RequestBody ExpensesDtos.CatalogRequest request) {
    return service.createCatalog(request);
  }

  @PutMapping("/catalog/{id}")
  public ExpensesDtos.CatalogResponse updateCatalog(
      @PathVariable Long id, @RequestBody ExpensesDtos.CatalogRequest request) {
    return service.updateCatalog(id, request);
  }

  @PatchMapping("/catalog/{id}/activation")
  public ExpensesDtos.CatalogResponse setCatalogActive(
      @PathVariable Long id, @RequestBody ExpensesDtos.CatalogActivationRequest request) {
    return service.setCatalogActive(id, request == null ? null : request.active());
  }

  @DeleteMapping("/catalog/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteCatalog(@PathVariable Long id) {
    service.deleteCatalog(id);
  }

  @GetMapping("/requests")
  public List<ExpensesDtos.ExpenseResponse> listExpenses() {
    return service.listExpenses();
  }

  @PostMapping("/requests")
  @ResponseStatus(HttpStatus.CREATED)
  public ExpensesDtos.ExpenseResponse createExpense(
      @RequestBody ExpensesDtos.ExpenseRequest request) {
    return service.createExpense(request);
  }

  @PatchMapping("/requests/{id}/status")
  public ExpensesDtos.ExpenseResponse setExpenseStatus(
      @PathVariable Long id, @RequestBody ExpensesDtos.StatusRequest request) {
    return service.setExpenseStatus(id, request == null ? null : request.status());
  }

  @GetMapping("/purchases")
  public List<ExpensesDtos.PurchaseResponse> listPurchases() {
    return service.listPurchases();
  }

  @PostMapping("/purchases")
  @ResponseStatus(HttpStatus.CREATED)
  public ExpensesDtos.PurchaseResponse createPurchase(
      @RequestBody ExpensesDtos.PurchaseRequest request) {
    return service.createPurchase(request);
  }

  @PatchMapping("/purchases/{id}/status")
  public ExpensesDtos.PurchaseResponse setPurchaseStatus(
      @PathVariable Long id, @RequestBody ExpensesDtos.StatusRequest request) {
    return service.setPurchaseStatus(id, request == null ? null : request.status());
  }

  @GetMapping("/returns")
  public List<ExpensesDtos.ReturnResponse> listReturns() {
    return service.listReturns();
  }

  @PostMapping("/returns")
  @ResponseStatus(HttpStatus.CREATED)
  public ExpensesDtos.ReturnResponse createReturn(
      @RequestBody ExpensesDtos.ReturnRequest request) {
    return service.createReturn(request);
  }

  /** O funcionário marca a devolução como devolvida ou rejeitada (com motivo). */
  @PostMapping("/returns/{id}/resolve")
  public ExpensesDtos.ReturnResponse resolveReturn(
      @PathVariable Long id, @RequestBody ExpensesDtos.ResolveReturnRequest request) {
    return service.resolveReturn(id, request);
  }

  @PatchMapping("/returns/{id}/status")
  public ExpensesDtos.ReturnResponse setReturnStatus(
      @PathVariable Long id, @RequestBody ExpensesDtos.StatusRequest request) {
    return service.setReturnStatus(id, request == null ? null : request.status());
  }

  /** Registos encaminhados ao funcionário autenticado. */
  @GetMapping("/forwarded")
  public ExpensesDtos.ForwardedResponse forwarded() {
    return service.forwarded();
  }

  @PutMapping("/{kind}/{id}/forward")
  public Object forward(
      @PathVariable String kind, @PathVariable Long id,
      @RequestBody ExpensesDtos.ForwardRequest request) {
    return service.forward(kind, id, request == null ? null : request.staffId());
  }

  @PutMapping("/{kind}/{id}/notes")
  public Object saveNotes(
      @PathVariable String kind, @PathVariable Long id,
      @RequestBody ExpensesDtos.NotesRequest request) {
    return service.saveNotes(kind, id, request == null ? null : request.notes());
  }

  @PostMapping("/{kind}/{id}/conclude")
  public Object conclude(@PathVariable String kind, @PathVariable Long id) {
    return service.conclude(kind, id);
  }

  @GetMapping("/sales")
  public List<ExpensesDtos.SaleResponse> listSales() {
    return service.listSales();
  }

  @PostMapping("/sales")
  @ResponseStatus(HttpStatus.CREATED)
  public ExpensesDtos.SaleResponse createSale(@RequestBody ExpensesDtos.SaleRequest request) {
    return service.createSale(request);
  }

  @PatchMapping("/sales/{id}/status")
  public ExpensesDtos.SaleResponse setSaleStatus(
      @PathVariable Long id, @RequestBody ExpensesDtos.StatusRequest request) {
    return service.setSaleStatus(id, request == null ? null : request.status());
  }
}
