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
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Ficheiro guardado dentro de uma pasta (o conteúdo fica no disco, dentro da pasta). */
@Entity
@Table(name = "cacoin_folder_files")
@Getter
@Setter
@NoArgsConstructor
public class FolderFile {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "folder_id")
  private Folder folder;

  @Column(nullable = false, length = 200)
  private String name;

  @Column(nullable = false)
  private long size;

  @Column(length = 120)
  private String contentType;

  private Long addedById;

  @Column(length = 40)
  private String addedByCode;

  @Column(length = 160)
  private String addedByName;

  @Column(nullable = false)
  private Instant addedAt;
}
