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
 * Fotografia do cartão de um estudante ou de um funcionário (data URL já reduzida pelo
 * navegador). Fica numa tabela própria para não pesar nas listas de estudantes e funcionários.
 * Uma linha tem `studentId` ou `staffId`, nunca os dois.
 */
@Entity
@Table(name = "person_photos")
@Getter
@Setter
@NoArgsConstructor
public class PersonPhoto {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "student_id", unique = true)
  private Long studentId;

  @Column(name = "staff_id", unique = true)
  private Long staffId;

  @Column(columnDefinition = "TEXT", nullable = false)
  private String photo;

  @Column(name = "updated_at")
  private Instant updatedAt;
}
