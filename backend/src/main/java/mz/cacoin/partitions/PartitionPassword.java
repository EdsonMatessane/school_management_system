package mz.cacoin.partitions;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.stereotype.Component;

/**
 * Palavra-passe exigida para repartir o sistema e para repor o acesso do administrador de uma
 * repartição. Só existe no backend. O valor por omissão pode (e num repositório público deve) ser
 * substituído com a variável de ambiente CACOIN_PARTITION_PASSWORD.
 */
@Component
public class PartitionPassword {
  /** Valor por omissão, usado quando CACOIN_PARTITION_PASSWORD não está definida. */
  static final String DEFAULT = "2002";

  private final byte[] expected;

  public PartitionPassword(
      @org.springframework.beans.factory.annotation.Value("${cacoin.partitions.password:" + DEFAULT + "}")
          String configured) {
    String value = configured == null || configured.isBlank() ? DEFAULT : configured;
    this.expected = value.getBytes(StandardCharsets.UTF_8);
  }

  public boolean matches(String given) {
    return given != null
        && MessageDigest.isEqual(given.getBytes(StandardCharsets.UTF_8), expected);
  }
}
