package mz.cacoin.mobilemoney;

import java.math.BigDecimal;
import java.time.Instant;

public interface MobileMoneyGateway {
  String PENDING = "PENDING";
  String SUCCESS = "SUCCESS";
  String FAILED = "FAILED";

  record Request(
      MobileMoneyWallet wallet, String phone, String destination, BigDecimal amount, String reference) {}

  record Initiation(boolean accepted, String providerReference, String message) {}

  record Outcome(String state, String message) {}

  Initiation request(Request request);

  Outcome check(String providerReference, MobileMoneyWallet wallet, String phone, Instant requestedAt);
}
