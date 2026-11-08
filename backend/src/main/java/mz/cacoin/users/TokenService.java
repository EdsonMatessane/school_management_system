package mz.cacoin.users;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class TokenService {
  private static final Logger LOG = LoggerFactory.getLogger(TokenService.class);

  public record Claims(Long accountId, String kind) {}

  private final byte[] secret;
  private final long ttlSeconds;

  public TokenService(
      @Value("${cacoin.auth.secret:}") String configuredSecret,
      @Value("${cacoin.auth.token-hours:12}") long tokenHours,
      @Value("${cacoin.auth.secret-file:./data/auth-secret.key}") String secretFile) {
    if (configuredSecret == null || configuredSecret.isBlank()) {
      this.secret = persistedSecret(Path.of(secretFile));
    } else {
      this.secret = configuredSecret.getBytes(StandardCharsets.UTF_8);
    }
    this.ttlSeconds = tokenHours * 3600;
  }

  /**
   * Sem segredo configurado, gera-se um e guarda-se num ficheiro: assim as sessões sobrevivem a
   * reinícios do servidor em vez de todos terem de iniciar sessão de novo.
   */
  private static byte[] persistedSecret(Path file) {
    try {
      if (Files.isRegularFile(file)) {
        byte[] stored = Base64.getDecoder()
            .decode(Files.readString(file, StandardCharsets.UTF_8).trim());
        if (stored.length >= 32) {
          return stored;
        }
      }
    } catch (IOException | IllegalArgumentException exception) {
      LOG.warn("Segredo de sessão ilegível em {}; será gerado um novo", file);
    }
    byte[] generated = new byte[32];
    new SecureRandom().nextBytes(generated);
    try {
      Path parent = file.toAbsolutePath().getParent();
      if (parent != null) {
        Files.createDirectories(parent);
      }
      Files.writeString(file, Base64.getEncoder().encodeToString(generated), StandardCharsets.UTF_8);
      try {
        Files.setPosixFilePermissions(file, PosixFilePermissions.fromString("rw-------"));
      } catch (UnsupportedOperationException | IOException ignored) {
        // sistema de ficheiros sem permissões POSIX (Windows)
      }
    } catch (IOException exception) {
      LOG.warn("Não foi possível guardar o segredo de sessão ({}); as sessões terminam ao reiniciar",
          exception.getMessage());
    }
    return generated;
  }

  public String issue(UserAccount account) {
    String payload = account.getId() + "." + account.getKind() + "."
        + (Instant.now().getEpochSecond() + ttlSeconds);
    String encoded = Base64.getUrlEncoder().withoutPadding()
        .encodeToString(payload.getBytes(StandardCharsets.UTF_8));
    return encoded + "." + sign(encoded);
  }

  public Optional<Claims> verify(String token) {
    if (token == null) return Optional.empty();
    String[] parts = token.split("\\.");
    if (parts.length != 2) return Optional.empty();
    if (!MessageDigest.isEqual(
        sign(parts[0]).getBytes(StandardCharsets.UTF_8),
        parts[1].getBytes(StandardCharsets.UTF_8))) {
      return Optional.empty();
    }
    try {
      String[] payload = new String(
          Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8).split("\\.");
      if (payload.length != 3 || Long.parseLong(payload[2]) < Instant.now().getEpochSecond()) {
        return Optional.empty();
      }
      return Optional.of(new Claims(Long.parseLong(payload[0]), payload[1]));
    } catch (IllegalArgumentException exception) {
      return Optional.empty();
    }
  }

  private String sign(String value) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret, "HmacSHA256"));
      return Base64.getUrlEncoder().withoutPadding()
          .encodeToString(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
    } catch (java.security.GeneralSecurityException exception) {
      throw new IllegalStateException(exception);
    }
  }
}
