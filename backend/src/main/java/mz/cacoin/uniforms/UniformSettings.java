package mz.cacoin.uniforms;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "uniform_settings")
@Getter
@Setter
@NoArgsConstructor
public class UniformSettings {
  @Id
  private Long id = 1L;

  @Column(nullable = false, precision = 12, scale = 2)
  private BigDecimal fee = BigDecimal.ZERO;

  @Column(name = "fee_active", nullable = false)
  private boolean feeActive = true;
}
