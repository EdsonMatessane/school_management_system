package mz.cacoin.expenses;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/** Campos comuns a despesas, compras, devoluções e vendas que podem ser encaminhados a um funcionário. */
@MappedSuperclass
@Getter
@Setter
public abstract class ForwardableRecord {
  public static final String TODO = "TODO";
  public static final String DONE = "DONE";

  /** Funcionário (staff_members) a quem o administrador encaminhou o registo. */
  @Column(name = "forwarded_to_id")
  private Long forwardedToId;

  /** TODO (por fazer) ou DONE (concluído); vazio enquanto não foi encaminhado. */
  @Column(name = "forward_status", length = 20)
  private String forwardStatus;

  @Column(name = "forwarded_at")
  private Instant forwardedAt;

  @Column(name = "concluded_at")
  private Instant concludedAt;

  /** Anotações em texto formatado, escritas pelo administrador ou pelo funcionário. */
  @Column(name = "notes", columnDefinition = "TEXT")
  private String notes;
}
