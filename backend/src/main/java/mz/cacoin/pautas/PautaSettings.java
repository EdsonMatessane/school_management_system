package mz.cacoin.pautas;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "pauta_settings")
@Getter
@Setter
@NoArgsConstructor
public class PautaSettings {
  @Id
  private Long id = 1L;

  @Column(name = "launch_period_start")
  private LocalDateTime launchPeriodStart;

  @Column(name = "launch_period_end")
  private LocalDateTime launchPeriodEnd;
}
