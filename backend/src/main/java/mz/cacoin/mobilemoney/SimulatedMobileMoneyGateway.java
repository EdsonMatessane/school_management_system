package mz.cacoin.mobilemoney;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/** Só para desenvolvimento (CACOIN_MOBILE_MONEY_MODE=simulated); não é um bean. */
public class SimulatedMobileMoneyGateway implements MobileMoneyGateway {
  private static final Duration CONFIRMATION_DELAY = Duration.ofSeconds(6);

  @Override
  public Initiation request(Request request) {
    return new Initiation(true, "SIM-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase(), null);
  }

  @Override
  public Outcome check(
      String providerReference, MobileMoneyWallet wallet, String phone, Instant requestedAt) {
    if (Duration.between(requestedAt, Instant.now()).compareTo(CONFIRMATION_DELAY) < 0) {
      return new Outcome(PENDING, null);
    }
    if (phone.endsWith("0")) {
      return new Outcome(FAILED, "PIN incorrecto");
    }
    if (phone.endsWith("9")) {
      return new Outcome(FAILED, "Saldo insuficiente");
    }
    return new Outcome(SUCCESS, null);
  }
}
