package mz.cacoin.partitions;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Registo (no sistema original) de cada repartição criada. */
@Entity
@Table(name = "system_partitions")
@Getter
@Setter
@NoArgsConstructor
public class SystemPartition {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "institution_name", nullable = false, length = 200)
  private String institutionName;

  @Column(nullable = false, length = 500)
  private String address;

  @Column(name = "database_name", nullable = false, unique = true, length = 63)
  private String databaseName;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  /** Activa = arranca com o sistema principal; inactiva = parada. */
  @Column(nullable = false, columnDefinition = "BOOLEAN NOT NULL DEFAULT TRUE")
  private boolean active = true;

  /** Porta do backend da repartição (atribuída automaticamente). */
  @Column
  private Integer port;
}
