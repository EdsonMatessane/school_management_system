package mz.cacoin.internalexpenses;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;
import java.util.List;

public final class InternalExpenseDtos {
  private InternalExpenseDtos() {}

  public record ExpenseRequest(
      String title,
      String description,
      String type,
      LocalDate expenseDate,
      LocalDate dueDate,
      String currency,
      BigDecimal baseAmount,
      BigDecimal discountAmount,
      BigDecimal taxAmount,
      BigDecimal otherCharges,
      String priority,
      Long requesterId,
      String department,
      String costCenter,
      Long categoryId,
      Long supplierId,
      String externalDocumentNumber,
      String notes) {}

  public record RequesterResponse(Long id, String name, String staffType) {}

  public record DecisionRequest(String actor, String comment) {}

  public record PaymentRequest(
      LocalDate paymentDate,
      BigDecimal amount,
      String method,
      String externalReference,
      String recordedBy) {}

  public record CategoryRequest(
      String code, String name, String description, boolean attachmentRequired, boolean active) {}

  public record SupplierRequest(
      String code,
      String legalName,
      String tradingName,
      String taxIdentifier,
      String phone,
      String email,
      String address,
      boolean active) {}

  public record BudgetRequest(
      String name,
      LocalDate periodStart,
      LocalDate periodEnd,
      String currency,
      BigDecimal approvedAmount,
      String department,
      String costCenter,
      Long categoryId,
      boolean active) {}

  public record SettingOptionRequest(String code, String label) {}

  public record ExpenseSettingsRequest(
      String defaultCurrency,
      BigDecimal budgetAlertPercent,
      List<SettingOptionRequest> currencies,
      List<SettingOptionRequest> expenseTypes,
      List<SettingOptionRequest> priorities,
      List<SettingOptionRequest> paymentMethods) {}

  public record ExpenseSettingsResponse(
      String defaultCurrency,
      BigDecimal budgetAlertPercent,
      List<SettingOptionRequest> currencies,
      List<SettingOptionRequest> expenseTypes,
      List<SettingOptionRequest> priorities,
      List<SettingOptionRequest> paymentMethods) {}

  public record ExpenseResponse(
      Long id,
      String reference,
      String title,
      String description,
      String type,
      LocalDate expenseDate,
      LocalDate dueDate,
      String currency,
      BigDecimal baseAmount,
      BigDecimal discountAmount,
      BigDecimal taxAmount,
      BigDecimal otherCharges,
      BigDecimal totalAmount,
      BigDecimal approvedAmount,
      BigDecimal paidAmount,
      BigDecimal balance,
      String priority,
      Long requesterId,
      String requesterName,
      String department,
      String costCenter,
      Long categoryId,
      String categoryName,
      Long supplierId,
      String supplierName,
      String externalDocumentNumber,
      String notes,
      String approvalStatus,
      String paymentStatus,
      String lastDecisionBy,
      String lastDecisionComment,
      long version,
      Instant createdAt,
      Instant updatedAt) {}

  public record PaymentResponse(
      Long id,
      String reference,
      Long expenseId,
      LocalDate paymentDate,
      BigDecimal amount,
      String method,
      String externalReference,
      String recordedBy,
      boolean reversed,
      String reversalReason,
      Instant createdAt) {}

  public record AuditResponse(
      Long id, Long expenseId, String action, String actor, String reason, Instant createdAt) {}

  public record DashboardResponse(
      BigDecimal requestedAmount,
      BigDecimal approvedAmount,
      BigDecimal paidAmount,
      BigDecimal outstandingAmount,
      long pendingApprovals,
      long returnedOrRejected,
      long overdueExpenses,
      long budgetAlerts) {}

  public record BudgetResponse(
      Long id,
      String name,
      LocalDate periodStart,
      LocalDate periodEnd,
      String currency,
      BigDecimal approvedAmount,
      BigDecimal committedAmount,
      BigDecimal paidAmount,
      BigDecimal availableAmount,
      String department,
      String costCenter,
      Long categoryId,
      String categoryName,
      boolean active) {}
}
