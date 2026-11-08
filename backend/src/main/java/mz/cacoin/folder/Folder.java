package mz.cacoin.folder;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
    name = "cacoin_folders",
    uniqueConstraints = @UniqueConstraint(columnNames = {"parent_id", "name"}))
@Getter
@Setter
@NoArgsConstructor
public class Folder {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "parent_id")
  private Folder parent;

  @Column(nullable = false, length = 120)
  private String name;

  /** Quem criou a pasta (cópia do nome no momento da criação) e quando. */
  private Long createdById;

  @Column(length = 40)
  private String createdByCode;

  @Column(length = 160)
  private String createdByName;

  private Instant createdAt;
}
