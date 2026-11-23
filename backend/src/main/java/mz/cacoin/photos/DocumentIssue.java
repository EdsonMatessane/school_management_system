package mz.cacoin.photos;

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

/**
 * Registo de cada emissão (descarga) do cartão ou da carta de boas-vindas. Serve para saber
 * quantas vias saíram; a auditoria regista quem a emitiu e quando.
 */
@Entity
@Table(name = "document_issues")
@Getter
@Setter
@NoArgsConstructor
public class DocumentIssue {
  public static final String CARD = "CARD";
  public static final String LETTER = "LETTER";

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "student_id")
  private Long studentId;

  @Column(name = "staff_id")
  private Long staffId;

  @Column(nullable = false, length = 10)
  private String document;

  @Column(name = "issued_at", nullable = false)
  private Instant issuedAt = Instant.now();
}
