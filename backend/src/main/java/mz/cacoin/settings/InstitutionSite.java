package mz.cacoin.settings;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Website da instituição (linha única). Só o sistema principal o usa. */
@Entity
@Table(name = "institution_site")
@Getter
@Setter
@NoArgsConstructor
public class InstitutionSite {
  public static final long SINGLE_ID = 1L;

  @Id
  private Long id = SINGLE_ID;

  @Column(length = 300)
  private String website;
}
