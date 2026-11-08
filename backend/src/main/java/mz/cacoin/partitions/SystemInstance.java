package mz.cacoin.partitions;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Identidade desta instalação. No sistema original não existe linha. Uma repartição nasce com a
 * linha 1 já criada pelo sistema que a repartiu, com {@code partition = true}: é assim que ela
 * sabe que não pode repartir outros sistemas.
 */
@Entity
@Table(name = "system_instance")
@Getter
@Setter
@NoArgsConstructor
public class SystemInstance {
  public static final long SINGLE_ID = 1L;

  @Id
  private Long id = SINGLE_ID;

  @Column(name = "is_partition", nullable = false)
  private boolean partition;

  @Column(name = "institution_name", length = 200)
  private String institutionName;

  @Column(length = 500)
  private String address;

  @Column(name = "created_at")
  private Instant createdAt;
}
