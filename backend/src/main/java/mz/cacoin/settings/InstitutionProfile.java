package mz.cacoin.settings;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Dados da instituição usados no cabeçalho e no rodapé dos relatórios (linha única). O
 * administrador edita-os no navegador; o servidor guarda uma cópia para que os portais dos
 * estudantes gerem PDFs com o mesmo cabeçalho e rodapé. Não guarda dados de pessoas.
 */
@Entity
@Table(name = "institution_profile")
@Getter
@Setter
@NoArgsConstructor
public class InstitutionProfile {
  public static final long SINGLE_ID = 1L;

  @Id
  private Long id = SINGLE_ID;

  @Column(columnDefinition = "TEXT")
  private String name;

  @Column(columnDefinition = "TEXT")
  private String slogan;

  @Column(columnDefinition = "TEXT")
  private String address;

  @Column(name = "primary_phone", columnDefinition = "TEXT")
  private String primaryPhone;

  @Column(columnDefinition = "TEXT")
  private String email;

  @Column(name = "report_footer", columnDefinition = "TEXT")
  private String reportFooter;

  /** Logótipo como data URL (data:image/...;base64,...). */
  @Column(columnDefinition = "TEXT")
  private String logo;

  @Column(name = "updated_at")
  private Instant updatedAt;
}
