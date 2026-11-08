package mz.cacoin.receipts;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
    name = "receipt_numbers",
    uniqueConstraints = {
      @UniqueConstraint(name = "uq_receipt_numbers_kind_record", columnNames = {"kind", "record_id"}),
      @UniqueConstraint(name = "uq_receipt_numbers_kind_number", columnNames = {"kind", "number"})
    })
@Getter
@Setter
@NoArgsConstructor
public class ReceiptNumber {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 30)
  private String kind;

  @Column(name = "record_id", nullable = false)
  private Long recordId;

  @Column(nullable = false)
  private Integer number;
}
