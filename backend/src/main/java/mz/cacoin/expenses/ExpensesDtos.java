package mz.cacoin.expenses;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public final class ExpensesDtos {
  private ExpensesDtos() {}

  public record CatalogRequest(String kind, String name) {}

  public record CatalogActivationRequest(Boolean active) {}

  public record CatalogResponse(Long id, String kind, String name, boolean active) {}

  public record StatusRequest(String status) {}

  public record ForwardRequest(Long staffId) {}

  public record NotesRequest(String notes) {}

  /** Encaminhamento de um registo para um funcionário (nulo enquanto não foi encaminhado). */
  public record ForwardInfo(
      Long staffId, String staffName, String status, Instant forwardedAt, Instant concludedAt) {}

  /** Registos encaminhados ao funcionário autenticado. */
  public record ForwardedResponse(
      java.util.List<ExpenseResponse> expenses,
      java.util.List<PurchaseResponse> purchases,
      java.util.List<ReturnResponse> returns,
      java.util.List<SaleResponse> sales) {}

  public record ExpenseRequest(
      String name,
      Long expenseTypeId,
      Long serviceTypeId,
      BigDecimal requestedAmount,
      String description,
      String specification) {}

  public record ExpenseResponse(
      Long id,
      String name,
      Long expenseTypeId,
      String expenseTypeName,
      Long serviceTypeId,
      String serviceTypeName,
      BigDecimal requestedAmount,
      String specification,
      String description,
      LocalDate serviceDate,
      String status,
      String statusLabel,
      String statusTone,
      String notes,
      ForwardInfo forward) {}

  public record PurchaseRequest(
      String itemName,
      Integer quantity,
      String quantityUnit,
      String store,
      String address,
      BigDecimal unitPrice,
      String specification,
      String observation) {}

  public record PurchaseResponse(
      Long id,
      String itemName,
      Integer quantity,
      String quantityUnit,
      String store,
      String address,
      BigDecimal unitPrice,
      BigDecimal totalPrice,
      String specification,
      String observation,
      LocalDate requestDate,
      LocalDate acquisitionDate,
      String status,
      String statusLabel,
      String statusTone,
      String notes,
      ForwardInfo forward) {}

  /** Devolução: só o artigo (compra) e o motivo; o resto vem dos detalhes da compra. */
  public record ReturnRequest(Long purchaseId, String reason) {}

  /** Resultado da devolução feita pelo funcionário: RETURNED ou REJECTED (com motivo). */
  public record ResolveReturnRequest(String outcome, String rejectionReason) {}

  public record ReturnResponse(
      Long id,
      Long purchaseId,
      String itemName,
      Integer quantity,
      String quantityUnit,
      String store,
      String address,
      BigDecimal unitPrice,
      BigDecimal totalPrice,
      String specification,
      String observation,
      LocalDate returnDate,
      String reason,
      String rejectionReason,
      String status,
      String statusLabel,
      String statusTone,
      String notes,
      ForwardInfo forward) {}

  public record SaleRequest(
      String itemName,
      Integer quantity,
      BigDecimal unitPrice,
      String specification,
      String buyer,
      String observation) {}

  public record SaleResponse(
      Long id,
      String itemName,
      Integer quantity,
      BigDecimal unitPrice,
      BigDecimal totalPrice,
      String specification,
      String buyer,
      LocalDate saleDate,
      String status,
      String statusLabel,
      String statusTone,
      String observation,
      String notes,
      ForwardInfo forward) {}
}
