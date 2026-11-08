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
@Table(name = "purchases")
@Getter
@Setter
@NoArgsConstructor
public class Purchase extends ForwardableRecord {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "item_name", nullable = false, length = 200)
  private String itemName;

  @Column
  private Integer quantity;

  /** Unidade da quantidade em texto livre: unidade(s), caixa(s), kg, ... */
  @Column(name = "quantity_unit", length = 60)
  private String quantityUnit;

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

  @Column(name = "request_date", nullable = false)
  private LocalDate requestDate;

  @Column(name = "acquisition_date")
  private LocalDate acquisitionDate;

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
