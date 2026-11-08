package mz.cacoin.mobilemoney;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.security.KeyPairGenerator;
import java.util.Base64;
import org.junit.jupiter.api.Test;

class MpesaPublicKeyTest {
  private static String publicKey() throws Exception {
    KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
    generator.initialize(2048);
    return Base64.getEncoder().encodeToString(generator.generateKeyPair().getPublic().getEncoded());
  }

  @Test
  void acceptsTheBase64BodyAsShownInThePortal() throws Exception {
    assertTrue(MpesaMobileMoneyGateway.isValidPublicKey(publicKey()));
  }

  @Test
  void acceptsAFullPemBlock() throws Exception {
    String pem = "-----BEGIN PUBLIC KEY-----\n"
        + publicKey().replaceAll("(.{64})", "$1\n")
        + "\n-----END PUBLIC KEY-----";
    assertTrue(MpesaMobileMoneyGateway.isValidPublicKey(pem));
  }

  @Test
  void rejectsGarbage() {
    assertFalse(MpesaMobileMoneyGateway.isValidPublicKey("abc123"));
    assertFalse(MpesaMobileMoneyGateway.isValidPublicKey("!!!"));
    assertFalse(MpesaMobileMoneyGateway.isValidPublicKey(""));
  }
}
