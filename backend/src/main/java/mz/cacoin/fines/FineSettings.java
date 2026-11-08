package mz.cacoin.fines;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Definição única (id 1) da multa por atraso das mensalidades. */
@Entity
@Table(name = "fine_settings")
@Getter
@Setter
@NoArgsConstructor
public class FineSettings {
  public static final long SINGLE_ID = 1L;

  @Id
  private Long id = SINGLE_ID;

  /** Percentagem da mensalidade cobrada como multa; vazio quando não está definida. */
  @Column(name = "late_percent", precision = 5, scale = 2)
  private BigDecimal latePercent;
}
