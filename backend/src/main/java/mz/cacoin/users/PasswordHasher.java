package mz.cacoin.users;

import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import org.springframework.stereotype.Component;

@Component
public class PasswordHasher {
  private static final int ITERATIONS = 120_000;
  private static final int KEY_BITS = 256;
  private static final String ALGORITHM = "PBKDF2WithHmacSHA256";
  private final SecureRandom random = new SecureRandom();

  public String hash(String password) {
    byte[] salt = new byte[16];
    random.nextBytes(salt);
    return "pbkdf2$" + ITERATIONS + "$"
        + Base64.getEncoder().encodeToString(salt) + "$"
        + Base64.getEncoder().encodeToString(derive(password, salt, ITERATIONS));
  }

  public boolean matches(String password, String stored) {
    if (stored == null) return false;
    String[] parts = stored.split("\\$");
    if (parts.length != 4 || !"pbkdf2".equals(parts[0])) return false;
    byte[] expected = Base64.getDecoder().decode(parts[3]);
    byte[] actual = derive(password, Base64.getDecoder().decode(parts[2]), Integer.parseInt(parts[1]));
    return MessageDigest.isEqual(expected, actual);
  }

  public boolean sameText(String first, String second) {
    return MessageDigest.isEqual(
        first.getBytes(java.nio.charset.StandardCharsets.UTF_8),
        second.getBytes(java.nio.charset.StandardCharsets.UTF_8));
  }

  private byte[] derive(String password, byte[] salt, int iterations) {
    try {
      return SecretKeyFactory.getInstance(ALGORITHM)
          .generateSecret(new PBEKeySpec(password.toCharArray(), salt, iterations, KEY_BITS))
          .getEncoded();
    } catch (GeneralSecurityException exception) {
      throw new IllegalStateException(exception);
    }
  }
}
