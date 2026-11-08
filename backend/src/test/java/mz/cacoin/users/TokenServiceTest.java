package mz.cacoin.users;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class TokenServiceTest {
  private static UserAccount account() {
    UserAccount account = new UserAccount();
    account.setId(7L);
    account.setKind(UserAccount.ADMIN);
    return account;
  }

  @Test
  void generatedSecretSurvivesARestart() throws IOException {
    Path file = Files.createTempDirectory("cacoin-secret").resolve("auth-secret.key");
    String token = new TokenService("", 12, file.toString()).issue(account());

    TokenService afterRestart = new TokenService("", 12, file.toString());

    assertTrue(Files.isRegularFile(file));
    assertEquals(7L, afterRestart.verify(token).orElseThrow().accountId());
  }

  @Test
  void differentSecretsDoNotAcceptEachOthersTokens() throws IOException {
    Path first = Files.createTempDirectory("cacoin-secret-a").resolve("auth-secret.key");
    Path second = Files.createTempDirectory("cacoin-secret-b").resolve("auth-secret.key");
    String token = new TokenService("", 12, first.toString()).issue(account());

    assertFalse(new TokenService("", 12, second.toString()).verify(token).isPresent());
  }

  @Test
  void configuredSecretWinsOverTheFile() throws IOException {
    Path file = Files.createTempDirectory("cacoin-secret-c").resolve("auth-secret.key");
    String token = new TokenService("segredo-configurado", 12, file.toString()).issue(account());

    assertTrue(new TokenService("segredo-configurado", 12, "ignorado").verify(token).isPresent());
    assertFalse(Files.exists(file));
  }

  @Test
  void rejectsTamperedAndMalformedTokens() throws IOException {
    Path file = Files.createTempDirectory("cacoin-secret-d").resolve("auth-secret.key");
    TokenService service = new TokenService("", 12, file.toString());
    String token = service.issue(account());

    assertFalse(service.verify(token + "x").isPresent());
    assertFalse(service.verify("lixo").isPresent());
    assertFalse(service.verify(null).isPresent());
  }

  @Test
  void expiredTokensAreRejected() throws IOException {
    Path file = Files.createTempDirectory("cacoin-secret-e").resolve("auth-secret.key");
    TokenService expired = new TokenService("", -1, file.toString());

    assertFalse(expired.verify(expired.issue(account())).isPresent());
  }
}
