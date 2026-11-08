package mz.cacoin.common;

import java.time.Duration;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Estudantes e funcionários só podem ser apagados nas primeiras 24 horas depois de criados. */
public final class DeleteWindow {
  private static final Duration LIMIT = Duration.ofHours(24);

  private DeleteWindow() {}

  public static boolean open(Instant createdAt) {
    return createdAt != null && Duration.between(createdAt, Instant.now()).compareTo(LIMIT) <= 0;
  }

  public static void require(Instant createdAt, String subject) {
    if (!open(createdAt)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN,
          "O prazo de 24 horas para apagar " + subject + " terminou");
    }
  }
}
