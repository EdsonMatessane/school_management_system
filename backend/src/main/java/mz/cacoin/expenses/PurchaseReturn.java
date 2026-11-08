package mz.cacoin.expenses;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "purchase_returns")
@Getter
@Setter
@NoArgsConstructor
public class PurchaseReturn extends ForwardableRecord {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "item_name", nullable = false, length = 200)
  private String itemName;

  @Column
  private Integer quantity;

  @Column(name = "quantity_unit", length = 60)
  private String quantityUnit;

  /** Compra de que vem o artigo a devolver. */
  @Column(name = "purchase_id")
  private Long purchaseId;

  /** Motivo da devolução. */
  @Column(columnDefinition = "TEXT")
  private String reason;

  /** Motivo da rejeição, quando o funcionário não consegue devolver. */
  @Column(name = "rejection_reason", columnDefinition = "TEXT")
  private String rejectionReason;

  @Column(nullable = false, length = 200)
  private String store;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String address;

  @Column(name = "unit_price", precision = 14, scale = 2)
  private BigDecimal unitPrice;

  @Column(name = "total_price", precision = 14, scale = 2)
  private BigDecimal totalPrice;

  @Column(columnDefinition = "TEXT")
  private String specification;

  @Column(columnDefinition = "TEXT")
  private String observation;

  @Column(name = "return_date", nullable = false)
  private LocalDate returnDate;

  @Column(nullable = false, length = 60)
  private String status;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @PrePersist
  private void setCreatedAtIfMissing() {
    if (createdAt == null) {
      createdAt = Instant.now();
    }
  }
}
