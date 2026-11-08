package mz.cacoin.internalexpenses;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "internal_expense_suppliers")
@Getter
@Setter
@NoArgsConstructor
public class InternalExpenseSupplier {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true, length = 32)
  private String code;

  @Column(name = "legal_name", nullable = false, length = 180)
  private String legalName;

  @Column(name = "trading_name", length = 180)
  private String tradingName;

  @Column(name = "tax_identifier", length = 80)
  private String taxIdentifier;

  @Column(length = 80)
  private String phone;

  @Column(length = 180)
  private String email;

  @Column(columnDefinition = "TEXT")
  private String address;

  @Column(nullable = false)
  private boolean active = true;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @PrePersist
  @PreUpdate
  void onSave() {
    if (createdAt == null) createdAt = Instant.now();
    if (code != null) code = code.trim().toUpperCase();
    if (legalName != null) legalName = legalName.trim();
  }
}
