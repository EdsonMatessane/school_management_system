package mz.cacoin.internalexpenses;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "internal_expenses")
@Getter
@Setter
@NoArgsConstructor
public class InternalExpense {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true, length = 32)
  private String reference;

  @Column(nullable = false, length = 180)
  private String title;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String description;

  @Column(name = "expense_type", nullable = false, length = 32)
  private String type;

  @Column(name = "expense_date", nullable = false)
  private LocalDate expenseDate;

  @Column(name = "due_date")
  private LocalDate dueDate;

  @Column(nullable = false, length = 3)
  private String currency = "MZN";

  @Column(name = "base_amount", nullable = false, precision = 14, scale = 2)
  private BigDecimal baseAmount;

  @Column(name = "discount_amount", nullable = false, precision = 14, scale = 2)
  private BigDecimal discountAmount = BigDecimal.ZERO;

  @Column(name = "tax_amount", nullable = false, precision = 14, scale = 2)
  private BigDecimal taxAmount = BigDecimal.ZERO;

  @Column(name = "other_charges", nullable = false, precision = 14, scale = 2)
  private BigDecimal otherCharges = BigDecimal.ZERO;

  @Column(name = "total_amount", nullable = false, precision = 14, scale = 2)
  private BigDecimal totalAmount;

  @Column(name = "approved_amount", precision = 14, scale = 2)
  private BigDecimal approvedAmount;

  @Column(nullable = false, length = 16)
  private String priority = "NORMAL";

  @Column(name = "requester_id", nullable = false)
  private Long requesterId;

  @Column(nullable = false, length = 120)
  private String department;

  @Column(name = "cost_center", length = 120)
  private String costCenter;

  @Column(name = "category_id", nullable = false)
  private Long categoryId;

  @Column(name = "supplier_id")
  private Long supplierId;

  @Column(name = "external_document_number", length = 120)
  private String externalDocumentNumber;

  @Column(columnDefinition = "TEXT")
  private String notes;

  @Column(name = "approval_status", nullable = false, length = 24)
  private String approvalStatus = "DRAFT";

  @Column(name = "payment_status", nullable = false, length = 16)
  private String paymentStatus = "UNPAID";

  @Column(name = "last_decision_by", length = 180)
  private String lastDecisionBy;

  @Column(name = "last_decision_comment", columnDefinition = "TEXT")
  private String lastDecisionComment;

  @Column(nullable = false)
  private long version;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @PrePersist
  void onCreate() {
    Instant now = Instant.now();
    if (createdAt == null) createdAt = now;
    updatedAt = now;
  }

  @PreUpdate
  void onUpdate() {
    updatedAt = Instant.now();
    version++;
  }
}
